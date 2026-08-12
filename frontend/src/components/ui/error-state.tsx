import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Can't reach the database right now",
  description = "The backend query failed or the server is temporarily unreachable. Please check your connection and try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-6 text-center bg-surface border border-border rounded-lg space-y-3 font-body shadow-sm ${className}`}
    >
      <div className="h-10 w-10 rounded-full bg-flag-bg border border-flag/30 flex items-center justify-center text-flag">
        <AlertTriangle className="h-5 w-5" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="font-display text-sm font-semibold text-text-primary">
          {title}
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          {description}
        </p>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-8 text-xs font-mono gap-1.5 border-border text-text-primary hover:text-accent hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 mt-1"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry Request</span>
        </Button>
      )}
    </div>
  );
}
