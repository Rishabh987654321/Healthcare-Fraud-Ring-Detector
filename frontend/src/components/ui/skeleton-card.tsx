import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`p-4 rounded-lg border border-border bg-surface shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md shrink-0 bg-border/60" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 rounded bg-border/60" />
            <Skeleton className="h-3 w-24 rounded bg-border/40" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-md shrink-0 bg-border/60" />
      </div>
    </div>
  );
}
