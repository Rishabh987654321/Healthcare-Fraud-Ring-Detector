import { useState } from 'react';
import { FraudRing } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { ErrorState } from '@/components/ui/error-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RingDiagram } from '@/components/rings/RingDiagram';
import { ShieldAlert, MapPin, Phone, Eye } from 'lucide-react';

interface FraudRingsListProps {
  rings: FraudRing[];
  loading?: boolean;
  errorDetail?: string | null;
  onRetry?: () => void;
  onSelectRingEntity: (type: 'provider' | 'patient', id: string) => void;
}

export function FraudRingsList({
  rings,
  loading = false,
  errorDetail = null,
  onRetry,
  onSelectRingEntity,
}: FraudRingsListProps) {
  const [selectedRingForDiagram, setSelectedRingForDiagram] = useState<FraudRing | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (errorDetail) {
    return (
      <ErrorState
        title="Failed to Load Fraud Rings"
        description={errorDetail}
        onRetry={onRetry}
        className="bg-surface border-border shadow-sm"
      />
    );
  }

  if (!rings || rings.length === 0) {
    return (
      <div className="py-6 text-center text-text-muted text-xs font-body border border-dashed border-border rounded-md p-4 bg-surface">
        No active fraud rings detected across the current dataset.
      </div>
    );
  }

  const handleOpenProvider = (providerId: string) => {
    onSelectRingEntity('provider', providerId);
    setSelectedRingForDiagram(null);
  };

  return (
    <div className="space-y-4 font-body min-w-0 w-full">
      {rings.map((ring) => {
        const isRingA = ring.kind === 'shared_address_procedure';
        const primaryProvider = ring.providers[0];

        return (
          <Card key={ring.id} className="border-l-[3px] border-l-flag border-border bg-flag-bg shadow-sm overflow-hidden min-w-0 w-full">
            <CardHeader className="p-3.5 sm:p-4 pb-2 flex flex-row items-center justify-between space-y-0 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden mr-1">
                <ShieldAlert className="h-4 w-4 text-flag shrink-0" />
                <CardTitle className="text-xs font-semibold text-text-primary truncate" title={isRingA ? 'Ring A: Shared Office Ring' : 'Ring B: Billing Outlier Spike'}>
                  {isRingA ? 'Ring A: Shared Office Ring' : 'Ring B: Billing Outlier Spike'}
                </CardTitle>
              </div>
              <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0 font-mono bg-flag text-white font-bold shrink-0">
                {ring.severity}
              </Badge>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 pt-0 space-y-2.5 text-xs min-w-0">
              {/* Pattern Summary */}
              <div className="text-text-muted text-xs leading-relaxed break-words">
                {isRingA ? (
                  <span>
                    <strong className="text-text-primary">3 Providers</strong> sharing one office location, billing rare procedure{' '}
                    <code className="text-flag font-mono font-semibold">{ring.procedure.code}</code> across{' '}
                    <strong className="text-text-primary font-mono">{ring.patientCount || 15} shared patients</strong>.
                  </span>
                ) : (
                  <span>
                    Provider <strong className="text-text-primary">{primaryProvider?.name}</strong> billed procedure{' '}
                    <code className="text-flag font-mono font-semibold">{ring.procedure.code}</code> at{' '}
                    <strong className="text-flag font-mono">
                      {primaryProvider?.claimCount} claims (~5x specialty avg of {primaryProvider?.specialtyAvg})
                    </strong>
                    , sharing contact phone.
                  </span>
                )}
              </div>

              {/* Shared Node Pill */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted bg-surface p-2 rounded border border-border shadow-sm min-w-0">
                {ring.sharedNode.type === 'address' ? (
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                ) : (
                  <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                )}
                <span className="truncate min-w-0 flex-1" title={ring.sharedNode.label}>
                  {ring.sharedNode.label}
                </span>
              </div>

              {/* View Ring Diagram Dialog Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRingForDiagram(ring)}
                className="w-full block h-9 sm:h-8 text-xs border-flag/40 text-flag hover:bg-flag/10 hover:text-flag font-mono mt-1 bg-surface min-h-[36px] sm:min-h-0 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span>View Ring Diagram</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Ring Diagram Dialog Modal */}
      {selectedRingForDiagram && (
        <Dialog open={Boolean(selectedRingForDiagram)} onOpenChange={() => setSelectedRingForDiagram(null)}>
          <DialogContent className="max-w-2xl bg-surface border-border shadow-xl p-4 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base font-display font-semibold text-text-primary">
                Fraud Ring Evidence Diagram
              </DialogTitle>
            </DialogHeader>

            <RingDiagram
              ring={selectedRingForDiagram}
              onSelectProvider={handleOpenProvider}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
