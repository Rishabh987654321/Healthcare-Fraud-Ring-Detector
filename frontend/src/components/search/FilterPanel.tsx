import { Button } from '@/components/ui/button';
import { UserCheck, Stethoscope, Layers } from 'lucide-react';

interface FilterPanelProps {
  selectedType: 'all' | 'provider' | 'patient';
  onSelectType: (type: 'all' | 'provider' | 'patient') => void;
}

export function FilterPanel({ selectedType, onSelectType }: FilterPanelProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-raised/40 border border-border">
      <Button
        variant={selectedType === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('all')}
        className="h-7 text-xs flex-1 gap-1 px-2 font-mono"
      >
        <Layers className="h-3 w-3" />
        <span>All</span>
      </Button>
      <Button
        variant={selectedType === 'provider' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('provider')}
        className="h-7 text-xs flex-1 gap-1 px-2 font-mono"
      >
        <Stethoscope className="h-3 w-3" />
        <span>Providers</span>
      </Button>
      <Button
        variant={selectedType === 'patient' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSelectType('patient')}
        className="h-7 text-xs flex-1 gap-1 px-2 font-mono"
      >
        <UserCheck className="h-3 w-3" />
        <span>Patients</span>
      </Button>
    </div>
  );
}
