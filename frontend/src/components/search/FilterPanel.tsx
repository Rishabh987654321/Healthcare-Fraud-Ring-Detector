import { Button } from '@/components/ui/button';
import { UserCheck, Stethoscope, Layers } from 'lucide-react';

interface FilterPanelProps {
  selectedType: 'all' | 'provider' | 'patient';
  onSelectType: (type: 'all' | 'provider' | 'patient') => void;
}

export function FilterPanel({ selectedType, onSelectType }: FilterPanelProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-muted/80 border border-border shrink-0">
      <Button
        variant={selectedType === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('all')}
        className="h-8 sm:h-7 text-[11px] sm:text-xs flex-1 gap-1 px-1.5 sm:px-2 font-mono min-h-[36px] sm:min-h-0 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Layers className="h-3 w-3 shrink-0" />
        <span className="truncate">All</span>
      </Button>
      <Button
        variant={selectedType === 'provider' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('provider')}
        className="h-8 sm:h-7 text-[11px] sm:text-xs flex-1 gap-1 px-1.5 sm:px-2 font-mono min-h-[36px] sm:min-h-0 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Stethoscope className="h-3 w-3 shrink-0" />
        <span className="truncate">Providers</span>
      </Button>
      <Button
        variant={selectedType === 'patient' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('patient')}
        className="h-8 sm:h-7 text-[11px] sm:text-xs flex-1 gap-1 px-1.5 sm:px-2 font-mono min-h-[36px] sm:min-h-0 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <UserCheck className="h-3 w-3 shrink-0" />
        <span className="truncate">Patients</span>
      </Button>
    </div>
  );
}
