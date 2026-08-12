import { FraudRing } from '@/lib/types';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import { Badge } from '@/components/ui/badge';
import { SkeletonText } from '@/components/ui/skeleton-text';
import { SkeletonRow } from '@/components/ui/skeleton-row';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { CypherQueryBox } from '@/components/ui/cypher-query-box';
import { CYPHER_QUERIES } from '@/lib/cypher-reference';
import { ShieldAlert, MapPin, Phone, Calendar, Stethoscope, FileText } from 'lucide-react';

interface EntityDetailPanelProps {
  entityType: 'provider' | 'patient';
  entityId: string;
  fraudRings: FraudRing[];
  onSelectRelatedEntity?: (type: 'provider' | 'patient', id: string) => void;
}

export function EntityDetailPanel({
  entityType,
  entityId,
  fraudRings,
}: EntityDetailPanelProps) {
  const { detail, loading, error, refetch: fetchDetail } = useEntityDetail(entityType, entityId);

  if (loading) {
    return (
      <div className="p-6 space-y-6 font-body bg-surface h-full">
        <SkeletonText lines={2} />
        <SkeletonRow />
        <SkeletonRow />
        <div className="space-y-2 pt-4">
          <SkeletonText lines={1} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center bg-surface">
        <ErrorState
          title="Entity Details Unreachable"
          description={error || 'Could not load detail record for this entity.'}
          onRetry={fetchDetail}
          className="border-border shadow-sm"
        />
      </div>
    );
  }

  const ringA = fraudRings.find((r) => r.kind === 'shared_address_procedure' && r.providers.some((p) => p.id === detail.id));
  const ringB = fraudRings.find((r) => r.kind === 'billing_outlier' && r.providers.some((p) => p.id === detail.id));

  const cypherKey = detail.type === 'provider' ? 'entity-detail-provider' : 'entity-detail-patient';
  const cypherQuery = CYPHER_QUERIES[cypherKey] || '';

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 p-6 font-body bg-surface min-w-0">
      {/* Header */}
      <div className="border-b border-border pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Badge variant="outline" className="font-mono text-[10px] uppercase border-accent/30 bg-accent-muted text-accent shrink-0">
            {detail.type}
          </Badge>
          <span className="font-mono text-xs text-text-muted shrink-0">{detail.id}</span>
        </div>
        <h2 className="font-display text-lg font-semibold text-text-primary mt-1 truncate" title={detail.name}>{detail.name}</h2>
        <p className="font-body text-xs text-text-muted flex items-center gap-1.5 mt-0.5 truncate">
          {detail.type === 'provider' ? (
            <>
              <Stethoscope className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="truncate">{detail.specialty} • NPI: <strong className="font-mono text-text-primary">{detail.npi}</strong></span>
            </>
          ) : (
            <>
              <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>DOB: {detail.dob}</span>
            </>
          )}
        </p>
      </div>

      {/* Fraud Ring Alert Box (Signature 3px Solid Left Border) */}
      {(ringA || ringB) && (
        <div className="p-4 rounded-lg border-l-[3px] border-l-flag border-border bg-flag-bg text-text-primary space-y-2 shadow-sm min-w-0 break-words">
          <div className="flex items-center gap-2 text-flag font-display text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Flagged in Fraud Intelligence System</span>
          </div>

          {ringA && (
            <p className="text-xs text-text-primary leading-relaxed">
              <strong>Ring A (Shared Office Scheme):</strong> Shares an address node (
              <span className="font-mono font-semibold">{ringA.sharedNode.label}</span>) with 2 other providers,
              all billing rare procedure <code className="font-mono font-semibold text-flag">{ringA.procedure.code}</code> ({ringA.procedure.description}) across {ringA.patientCount || 15} of the exact same patients.
            </p>
          )}

          {ringB && (
            <p className="text-xs text-text-primary leading-relaxed">
              <strong>Ring B (Billing Volume Outlier):</strong> Exhibits an extreme billing spike for procedure{' '}
              <code className="font-mono font-semibold text-flag">{ringB.procedure.code}</code> ({ringB.procedure.description}), generating{' '}
              <strong className="text-flag font-mono">{ringB.providers[0]?.claimCount} claims</strong> (~5x the specialty average of {ringB.providers[0]?.specialtyAvg}), while sharing phone contact{' '}
              <span className="font-mono font-semibold">{ringB.sharedNode.label}</span>.
            </p>
          )}
        </div>
      )}

      {/* Address & Phone Cards */}
      <div className="grid grid-cols-1 gap-3 text-xs min-w-0">
        {detail.address && (
          <div className="p-3 rounded-md border border-border bg-bg-muted/50 flex items-start gap-2.5 shadow-sm min-w-0">
            <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="font-semibold text-text-primary block">Physical Address</span>
              <span className="text-text-muted break-words">{detail.address.line1}, {detail.address.city}, {detail.address.state} {detail.address.zip}</span>
            </div>
          </div>
        )}

        {detail.phone && (
          <div className="p-3 rounded-md border border-border bg-bg-muted/50 flex items-center gap-2.5 shadow-sm min-w-0">
            <Phone className="h-4 w-4 text-accent shrink-0" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="font-semibold text-text-primary">Phone: </span>
              <span className="text-text-muted font-mono">{detail.phone.number}</span>
            </div>
          </div>
        )}
      </div>

      {/* Claims Table */}
      <div className="space-y-3 pt-2 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-text-primary font-display text-xs font-semibold uppercase tracking-wider">
            <FileText className="h-4 w-4 text-accent" />
            <span>Associated Claims ({detail.claims.length})</span>
          </div>
        </div>

        {detail.claims.length === 0 ? (
          <div className="py-6 text-center text-text-muted text-xs border border-dashed border-border rounded-md">
            No claims recorded for this entity.
          </div>
        ) : (
          <div className="rounded-md border border-border bg-surface overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-muted/60 border-border">
                  <TableHead className="h-8 text-[10px] text-text-muted font-semibold">Claim ID / Date</TableHead>
                  <TableHead className="h-8 text-[10px] text-text-muted font-semibold">Procedure</TableHead>
                  <TableHead className="h-8 text-[10px] text-text-muted font-semibold text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.claims.slice(0, 15).map((claim) => (
                  <TableRow key={claim.id} className="h-9 text-xs border-border hover:bg-bg-muted/40">
                    <TableCell className="py-2">
                      <div className="font-mono text-[11px] font-semibold text-text-primary">{claim.id}</div>
                      <div className="text-[10px] text-text-muted">{claim.date}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-mono text-[11px] text-accent font-semibold">{claim.procedureCode}</div>
                      <div className="text-[10px] text-text-muted truncate max-w-[130px]" title={claim.procedureDescription}>{claim.procedureDescription}</div>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono font-semibold text-text-primary">
                      ${claim.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* View Cypher Query Toggle Section */}
      <div className="pt-2 min-w-0">
        <CypherQueryBox
          queryText={cypherQuery}
          title={`View Cypher Query (${detail.type === 'provider' ? 'get_provider_detail' : 'get_patient_detail'})`}
        />
      </div>
    </div>
  );
}
