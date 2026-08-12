import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonRowProps {
  className?: string;
}

export function SkeletonRow({ className = '' }: SkeletonRowProps) {
  return (
    <div className={`p-3 rounded-md border border-border/70 bg-surface/50 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-7 w-7 rounded shrink-0 bg-border/60" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-1/3 rounded bg-border/60" />
          <Skeleton className="h-3 w-1/4 rounded bg-border/40" />
        </div>
      </div>
      <Skeleton className="h-6 w-14 rounded shrink-0 bg-border/60" />
    </div>
  );
}
