import { FraudRing } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CypherQueryBox } from '@/components/ui/cypher-query-box';
import { CYPHER_QUERIES } from '@/lib/cypher-reference';
import { Stethoscope, MapPin, Phone, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

interface RingDiagramProps {
  ring: FraudRing;
  onSelectProvider?: (providerId: string) => void;
}

export function RingDiagram({ ring, onSelectProvider }: RingDiagramProps) {
  const isRingA = ring.kind === 'shared_address_procedure';
  const primaryProvider = ring.providers[0];

  const cypherKey = isRingA ? 'shared-address-ring' : 'billing-outlier-ring';
  const cypherQuery = CYPHER_QUERIES[cypherKey] || '';

  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-5 p-4 sm:p-6 rounded-xl border border-flag/40 bg-flag-bg text-text-primary shadow-sm font-body min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-flag/20 pb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden mr-2">
          <div className="h-7 w-7 rounded-md bg-flag/10 border border-flag/30 flex items-center justify-center text-flag shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h4 className="font-display text-xs sm:text-sm font-semibold text-text-primary truncate">
              {isRingA ? 'Ring A Evidence Diagram' : 'Ring B Evidence Diagram'}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-text-muted font-mono truncate">
              Pattern: {isRingA ? 'Shared Address & Rare Procedure' : 'Shared Phone & Billing Outlier'}
            </p>
          </div>
        </div>

        <Badge variant="destructive" className="font-mono text-[10px] sm:text-xs uppercase px-2 py-0.5 bg-flag text-white font-bold shrink-0">
          {ring.severity}
        </Badge>
      </div>

      {/* Static Purpose-Built Visual Hub Diagram */}
      <div className="relative w-full py-4 sm:py-6 px-3 sm:px-4 bg-surface rounded-lg border border-border flex flex-col items-center justify-center space-y-4 sm:space-y-6 min-h-[200px] shadow-sm min-w-0">
        {/* Hub Node (Shared Address / Shared Phone) */}
        <div className="z-10 px-3 py-2 rounded-lg border border-flag/40 bg-flag-bg shadow-sm flex items-center gap-2 text-xs font-mono font-semibold text-flag max-w-full min-w-0 overflow-hidden">
          {ring.sharedNode.type === 'address' ? (
            <MapPin className="h-4 w-4 shrink-0 text-accent" />
          ) : (
            <Phone className="h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] text-text-muted uppercase font-normal">Shared Resource Hub</span>
            <span className="text-text-primary font-bold truncate text-[11px] sm:text-xs" title={ring.sharedNode.label}>{ring.sharedNode.label}</span>
          </div>
        </div>

        {/* Connecting Line Indicator */}
        <div className="w-full flex items-center justify-center gap-2 my-1 min-w-0">
          <div className="h-0.5 flex-1 bg-border" />
          <Badge variant="outline" className="font-mono text-[9px] sm:text-[10px] text-flag border-flag/30 bg-flag-bg px-2 py-0.5 shrink-0 max-w-[85%] truncate">
            {isRingA ? 'Shares Address Hub & Rare Procedure CPT-99499' : 'Shares Phone Contact & Billing Spike'}
          </Badge>
          <div className="h-0.5 flex-1 bg-border" />
        </div>

        {/* Provider Cards Layout (Stacked on mobile < sm, grid on sm+) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 z-10 min-w-0">
          {ring.providers.map((pr) => (
            <Card
              key={pr.id}
              onClick={() => onSelectProvider && onSelectProvider(pr.id)}
              className="border-l-[3px] border-l-flag border-border bg-surface hover:bg-bg-muted transition-all cursor-pointer p-3 sm:p-4 space-y-1.5 shadow-sm group focus-visible:ring-2 focus-visible:ring-accent min-w-0 overflow-hidden min-h-[44px]"
            >
              <div className="flex items-center justify-between gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-accent font-display text-xs font-semibold min-w-0 flex-1 overflow-hidden">
                  <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={pr.name}>{pr.name}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>

              <div className="font-mono text-[10px] text-text-muted flex items-center justify-between pt-1 min-w-0 gap-1">
                <span className="shrink-0">{pr.id}</span>
                {pr.claimCount && (
                  <span className="text-flag font-semibold truncate shrink-0">
                    {pr.claimCount} Claims (~5x avg)
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Single Summary Line Underneath */}
      <div className="p-3 sm:p-4 rounded-lg border border-flag/30 bg-surface text-xs font-body text-text-primary leading-relaxed flex items-start gap-2 sm:gap-2.5 shadow-sm min-w-0 break-words">
        <AlertTriangle className="h-4 w-4 text-flag shrink-0 mt-0.5" />
        <div>
          {isRingA ? (
            <span>
              <strong>Ring Summary:</strong> Shares address <span className="font-mono font-semibold text-accent">{ring.sharedNode.label}</span> · Both bill <strong className="text-text-primary">{ring.procedure.description} ({ring.procedure.code})</strong> · <strong className="text-flag font-mono">{ring.patientCount || 15} shared patients</strong> across all 3 providers.
            </span>
          ) : (
            <span>
              <strong>Ring Summary:</strong> Shares phone contact <span className="font-mono font-semibold text-accent">{ring.sharedNode.label}</span> · <strong className="text-text-primary">{primaryProvider?.name}</strong> bills <strong className="text-text-primary">{ring.procedure.description} ({ring.procedure.code})</strong> at <strong className="text-flag font-mono">5x the specialty average</strong> ({primaryProvider?.claimCount} claims vs {primaryProvider?.specialtyAvg} avg).
            </span>
          )}
        </div>
      </div>

      {/* View Cypher Query Toggle Section */}
      <div className="min-w-0">
        <CypherQueryBox
          queryText={cypherQuery}
          title={`View Cypher Query (${isRingA ? 'find_shared_address_rings' : 'find_billing_outlier_rings'})`}
        />
      </div>
    </div>
  );
}
