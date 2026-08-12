import { useMemo } from 'react';
import { NetworkGraphData, NetworkNode, FraudRing } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { ErrorState } from '@/components/ui/error-state';
import {
  Network,
  ShieldAlert,
  MapPin,
  Phone,
  Stethoscope,
  UserCheck,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

interface ConnectionsPanelProps {
  data: NetworkGraphData | null;
  loading: boolean;
  onSelectNode: (node: NetworkNode) => void;
  fraudRings?: FraudRing[];
  selectedEntityId?: string;
  errorDetail?: string | null;
  onRetry?: () => void;
}

interface GroupedConnection {
  entity: NetworkNode;
  viaNode?: NetworkNode;
}

export function ConnectionsPanel({
  data,
  loading,
  onSelectNode,
  fraudRings = [],
  selectedEntityId,
  errorDetail = null,
  onRetry,
}: ConnectionsPanelProps) {
  // Compute grouped connections from graph data
  const { addressConnections, phoneConnections, procedureConnections, rootNode } =
    useMemo(() => {
      if (!data || !data.nodes || data.nodes.length === 0) {
        return {
          addressConnections: [],
          phoneConnections: [],
          procedureConnections: [],
          rootNode: null,
        };
      }

      const nodeMap = new Map<string, NetworkNode>();
      data.nodes.forEach((n) => nodeMap.set(n.id, n));

      const root =
        data.nodes.find((n) => n.id === selectedEntityId) ||
        data.nodes.find((n) => n.type === 'provider' || n.type === 'patient') ||
        data.nodes[0];

      const currentId = root?.id;

      const getNeighbors = (targetId: string): string[] => {
        const neighbors = new Set<string>();
        data.edges.forEach((e) => {
          if (e.source === targetId) neighbors.add(e.target);
          if (e.target === targetId) neighbors.add(e.source);
        });
        return Array.from(neighbors);
      };

      // 1. Shared Address Connections
      const addressNodes = data.nodes.filter(
        (n) => n.type === 'address' || n.id.startsWith('ADDR-')
      );
      const addrMap = new Map<string, GroupedConnection>();

      addressNodes.forEach((addrNode) => {
        const connectedIds = getNeighbors(addrNode.id);
        connectedIds.forEach((id) => {
          if (id !== currentId) {
            const entity = nodeMap.get(id);
            if (entity && (entity.type === 'provider' || entity.type === 'patient')) {
              if (!addrMap.has(entity.id)) {
                addrMap.set(entity.id, { entity, viaNode: addrNode });
              }
            }
          }
        });
      });

      // 2. Shared Phone Connections
      const phoneNodes = data.nodes.filter(
        (n) => n.type === 'phone' || n.id.startsWith('PHONE-')
      );
      const phoneMap = new Map<string, GroupedConnection>();

      phoneNodes.forEach((phoneNode) => {
        const connectedIds = getNeighbors(phoneNode.id);
        connectedIds.forEach((id) => {
          if (id !== currentId) {
            const entity = nodeMap.get(id);
            if (entity && (entity.type === 'provider' || entity.type === 'patient')) {
              if (!phoneMap.has(entity.id)) {
                phoneMap.set(entity.id, { entity, viaNode: phoneNode });
              }
            }
          }
        });
      });

      // 3. Shared Procedure & Overlapping Patients Connections
      const procedureNodes = data.nodes.filter(
        (n) => n.type === 'procedure' || n.id.startsWith('CPT-')
      );
      const procMap = new Map<string, GroupedConnection>();

      procedureNodes.forEach((procNode) => {
        const connectedClaimIds = getNeighbors(procNode.id);
        connectedClaimIds.forEach((claimId) => {
          const claimNeighbors = getNeighbors(claimId);
          claimNeighbors.forEach((id) => {
            if (id !== currentId) {
              const entity = nodeMap.get(id);
              if (
                entity &&
                (entity.type === 'provider' || entity.type === 'patient') &&
                !addrMap.has(entity.id) &&
                !phoneMap.has(entity.id)
              ) {
                if (!procMap.has(entity.id)) {
                  procMap.set(entity.id, { entity, viaNode: procNode });
                }
              }
            }
          });
        });
      });

      return {
        addressConnections: Array.from(addrMap.values()),
        phoneConnections: Array.from(phoneMap.values()),
        procedureConnections: Array.from(procMap.values()),
        rootNode: root,
      };
    }, [data, selectedEntityId]);

  const activeRingA = useMemo(() => {
    return fraudRings.find(
      (r) =>
        r.kind === 'shared_address_procedure' &&
        r.providers.some((p) => p.id === selectedEntityId)
    );
  }, [fraudRings, selectedEntityId]);

  const activeRingB = useMemo(() => {
    return fraudRings.find(
      (r) =>
        r.kind === 'billing_outlier' &&
        r.providers.some((p) => p.id === selectedEntityId)
    );
  }, [fraudRings, selectedEntityId]);

  // Loading State: Skeleton Cards
  if (loading) {
    return (
      <div className="w-full h-full p-6 space-y-4 bg-bg-muted overflow-y-auto min-w-0">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Error State
  if (errorDetail) {
    return (
      <div className="w-full h-full p-6 flex flex-col items-center justify-center bg-bg-muted min-w-0">
        <ErrorState
          title="Network Connection Failed"
          description={errorDetail}
          onRetry={onRetry}
          className="max-w-md bg-surface shadow-sm border-border"
        />
      </div>
    );
  }

  // Empty State: No Data
  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-text-muted bg-bg-muted font-body min-w-0">
        <Network className="h-10 w-10 text-text-muted/60 mb-3" />
        <h3 className="font-display text-sm font-semibold text-text-primary">
          No Network Selected
        </h3>
        <p className="text-xs max-w-sm mt-1 leading-relaxed text-text-muted">
          Search and select a provider or patient from the left rail, or click "View Ring Diagram" on a flagged ring card to inspect connections.
        </p>
      </div>
    );
  }

  const hasAnyConnections =
    addressConnections.length > 0 ||
    phoneConnections.length > 0 ||
    procedureConnections.length > 0;

  return (
    <div className="w-full h-full p-6 space-y-6 bg-bg-muted overflow-y-auto font-body min-w-0">
      {/* Prominent Evidence Alert Card (Above Grouped Connections) */}
      {(activeRingA || activeRingB) && (
        <Card className="border-l-[3px] border-l-flag border-border bg-flag-bg shadow-sm overflow-hidden min-w-0">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0 min-w-0">
            <div className="flex items-center gap-2 text-flag min-w-0 flex-1 overflow-hidden mr-2">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <CardTitle className="text-sm font-semibold tracking-tight text-text-primary truncate">
                {activeRingA ? 'Fraud Ring A Detected: Shared Office Scheme' : 'Fraud Ring B Detected: Billing Outlier Spike'}
              </CardTitle>
            </div>
            <Badge variant="destructive" className="font-mono text-xs uppercase px-2 bg-flag text-white font-bold shrink-0">
              High Evidence
            </Badge>
          </CardHeader>

          <CardContent className="p-6 pt-1 space-y-2 text-xs text-text-primary break-words">
            {activeRingA && (
              <p className="leading-relaxed">
                Shares office address <span className="font-mono font-semibold text-accent">{activeRingA.sharedNode.label}</span> with 2 other providers, all billing rare procedure{' '}
                <code className="font-mono font-semibold text-flag">{activeRingA.procedure.code}</code> ({activeRingA.procedure.description}) across {activeRingA.patientCount || 15} of the exact same patients.
              </p>
            )}

            {activeRingB && (
              <p className="leading-relaxed">
                Billed procedure <code className="font-mono font-semibold text-flag">{activeRingB.procedure.code}</code> ({activeRingB.procedure.description}) at{' '}
                <strong className="text-flag">
                  {activeRingB.providers[0]?.claimCount} claims (~5x specialty avg of {activeRingB.providers[0]?.specialtyAvg})
                </strong>
                , while sharing contact phone <span className="font-mono font-semibold text-accent">{activeRingB.sharedNode.label}</span>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Header Info for Selected Entity */}
      {rootNode && (
        <div className="flex items-center justify-between border-b border-border pb-3 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden mr-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Connected Relationships For
            </span>
            <h2 className="font-display text-base font-semibold text-text-primary flex items-center gap-2 mt-0.5 truncate" title={rootNode.label}>
              <span className="truncate">{rootNode.label}</span>
              <Badge variant="outline" className="font-mono text-[10px] uppercase border-accent/30 bg-accent-muted text-accent shrink-0">
                {rootNode.type}
              </Badge>
            </h2>
          </div>

          <span className="font-mono text-xs text-text-muted shrink-0">
            ID: {rootNode.id}
          </span>
        </div>
      )}

      {/* Group 1: Shares Address With */}
      {addressConnections.length > 0 && (
        <section className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 text-text-muted">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
              Shares Address With ({addressConnections.length})
            </h3>
          </div>

          <div className="space-y-3 min-w-0">
            {addressConnections.map(({ entity, viaNode }) => (
              <Card
                key={`addr-${entity.id}`}
                className={`transition-all overflow-hidden min-w-0 ${
                  entity.flagged
                    ? 'border-l-[3px] border-l-flag border-border bg-flag-bg shadow-sm'
                    : 'bg-surface border-border shadow-sm hover:border-accent/50'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div
                      className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 border ${
                        entity.flagged
                          ? 'bg-flag-bg border-flag/40 text-flag'
                          : 'bg-bg-muted border-border text-accent'
                      }`}
                    >
                      {entity.type === 'provider' ? (
                        <Stethoscope className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display text-sm font-semibold text-text-primary truncate" title={entity.label}>
                        {entity.label}
                      </div>
                      <div className="font-mono text-xs text-text-muted flex items-center gap-2 mt-0.5 truncate" title={`ID: ${entity.id}${viaNode ? ` • Location: ${viaNode.label}` : ''}`}>
                        <span className="shrink-0">ID: {entity.id}</span>
                        {viaNode && <span className="truncate">• Location: {viaNode.label}</span>}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={entity.flagged ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => onSelectNode(entity)}
                    className="h-8 gap-1 text-xs font-mono shrink-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Group 2: Shares Phone With */}
      {phoneConnections.length > 0 && (
        <section className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 text-text-muted">
            <Phone className="h-4 w-4 text-accent shrink-0" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
              Shares Phone With ({phoneConnections.length})
            </h3>
          </div>

          <div className="space-y-3 min-w-0">
            {phoneConnections.map(({ entity, viaNode }) => (
              <Card
                key={`phone-${entity.id}`}
                className={`transition-all overflow-hidden min-w-0 ${
                  entity.flagged
                    ? 'border-l-[3px] border-l-flag border-border bg-flag-bg shadow-sm'
                    : 'bg-surface border-border shadow-sm hover:border-accent/50'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div
                      className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 border ${
                        entity.flagged
                          ? 'bg-flag-bg border-flag/40 text-flag'
                          : 'bg-bg-muted border-border text-accent'
                      }`}
                    >
                      {entity.type === 'provider' ? (
                        <Stethoscope className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display text-sm font-semibold text-text-primary truncate" title={entity.label}>
                        {entity.label}
                      </div>
                      <div className="font-mono text-xs text-text-muted flex items-center gap-2 mt-0.5 truncate" title={`ID: ${entity.id}${viaNode ? ` • Phone: ${viaNode.label}` : ''}`}>
                        <span className="shrink-0">ID: {entity.id}</span>
                        {viaNode && <span className="truncate">• Phone: {viaNode.label}</span>}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={entity.flagged ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => onSelectNode(entity)}
                    className="h-8 gap-1 text-xs font-mono shrink-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Group 3: Billed Same Procedure & Overlapping Patients With */}
      {procedureConnections.length > 0 && (
        <section className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 text-text-muted">
            <FileSpreadsheet className="h-4 w-4 text-accent shrink-0" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
              Billed Same Procedure & Overlapping Patients With ({procedureConnections.length})
            </h3>
          </div>

          <div className="space-y-3 min-w-0">
            {procedureConnections.map(({ entity, viaNode }) => (
              <Card
                key={`proc-${entity.id}`}
                className={`transition-all overflow-hidden min-w-0 ${
                  entity.flagged
                    ? 'border-l-[3px] border-l-flag border-border bg-flag-bg shadow-sm'
                    : 'bg-surface border-border shadow-sm hover:border-accent/50'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <div
                      className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 border ${
                        entity.flagged
                          ? 'bg-flag-bg border-flag/40 text-flag'
                          : 'bg-bg-muted border-border text-accent'
                      }`}
                    >
                      {entity.type === 'provider' ? (
                        <Stethoscope className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-display text-sm font-semibold text-text-primary truncate" title={entity.label}>
                        {entity.label}
                      </div>
                      <div className="font-mono text-xs text-text-muted flex items-center gap-2 mt-0.5 truncate" title={`ID: ${entity.id}${viaNode ? ` • Code: ${viaNode.label}` : ''}`}>
                        <span className="shrink-0">ID: {entity.id}</span>
                        {viaNode && <span className="truncate">• Code: {viaNode.label}</span>}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={entity.flagged ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => onSelectNode(entity)}
                    className="h-8 gap-1 text-xs font-mono shrink-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Fallback if entity has network nodes but no grouped address/phone/procedure patterns */}
      {!hasAnyConnections && (
        <div className="py-8 text-center text-text-muted text-xs font-body border border-dashed border-border rounded-lg p-6 bg-surface min-w-0">
          <AlertCircle className="h-8 w-8 text-text-muted/60 mx-auto mb-2" />
          <p className="font-semibold text-text-primary">No Direct Shared Address, Phone, or Procedure Connections</p>
          <p className="mt-1">Try increasing the traversal depth (1/2/3) at the top right to discover multi-hop connections.</p>
        </div>
      )}
    </div>
  );
}
