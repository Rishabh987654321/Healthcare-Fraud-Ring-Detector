import { useState, KeyboardEvent } from 'react';
import { SearchResult } from '@/lib/types';
import { useEntitySearch } from '@/hooks/useEntitySearch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SkeletonRow } from '@/components/ui/skeleton-row';
import { ErrorState } from '@/components/ui/error-state';
import { Search, Stethoscope, UserCheck, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  filterType: 'all' | 'provider' | 'patient';
  onSelectResult: (result: SearchResult) => void;
}

const SUGGESTIONS = [
  { label: 'Try: Pendelton', value: 'Pendelton' },
  { label: 'Try: Ring A', value: 'PRV-RINGA-01' },
  { label: 'Try: PRV-RINGB-01', value: 'PRV-RINGB-01' },
];

export function SearchBar({ filterType, onSelectResult }: SearchBarProps) {
  const [query, setQuery] = useState<string>('');
  const { results, loading, errorDetail, executeSearch } = useEntitySearch(query, filterType);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      onSelectResult(results[0]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
    }
  };

  const entityTypeLabel =
    filterType === 'all'
      ? 'entities'
      : filterType === 'provider'
      ? 'providers'
      : 'patients';

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 font-body">
      <div className="space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Search name, ID, NPI (e.g. PRV-RINGA-01)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-8 bg-surface border-border text-sm font-body focus-visible:ring-2 focus-visible:ring-accent shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
              }}
              className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary rounded p-0.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Onboarding Suggestion Chips (Visible only when query is empty) */}
        {!query.trim() && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent shrink-0" />
              <span>Quick hints:</span>
            </span>
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug.value}
                type="button"
                onClick={() => setQuery(sug.value)}
                className="bg-accent-muted hover:bg-accent/20 text-accent border border-accent/20 px-2 py-0.5 rounded text-[10px] font-mono transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                {sug.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results / Browse Container taking full available vertical height */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
        {loading && (
          <div className="space-y-2 py-1">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!loading && errorDetail && (
          <ErrorState
            title="Search Unreachable"
            description={errorDetail}
            onRetry={executeSearch}
            className="bg-surface border-border shadow-sm"
          />
        )}

        {!loading && !errorDetail && query.trim() === '' && results.length > 0 && (
          <div className="px-1 text-[11px] font-mono text-text-muted shrink-0">
            Showing all {entityTypeLabel} ({results.length})
          </div>
        )}

        {!loading && !errorDetail && query.trim() === '' && results.length === 0 && (
          <div className="py-6 text-center text-text-muted text-xs font-body border border-dashed border-border rounded-md p-4 bg-surface">
            No {entityTypeLabel} found in the database.
          </div>
        )}

        {!loading && !errorDetail && query.trim() !== '' && results.length === 0 && (
          <div className="py-6 text-center text-text-muted text-xs font-body border border-dashed border-border rounded-md p-4 bg-surface">
            No entities matching "{query}" — try a different name or ID, or clear the search filter.
          </div>
        )}

        {!loading &&
          !errorDetail &&
          results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => onSelectResult(item)}
              className="w-full text-left p-3 rounded-md border border-border bg-surface hover:bg-bg-muted hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-all flex items-center justify-between group shadow-sm min-w-0"
            >
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                <div className="h-7 w-7 rounded flex items-center justify-center shrink-0 bg-bg-muted border border-border group-hover:border-accent/30 text-accent">
                  {item.type === 'provider' ? (
                    <Stethoscope className="h-3.5 w-3.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="truncate min-w-0 flex-1">
                  <div className="font-display text-xs font-semibold text-text-primary group-hover:text-accent truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="font-mono text-[10px] text-text-muted truncate">
                    {item.type === 'provider' ? item.specialty || item.id : `DOB: ${item.dob || 'N/A'}`}
                  </div>
                </div>
              </div>

              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase border-border text-text-muted group-hover:border-accent/30 group-hover:text-accent shrink-0 ml-2"
              >
                {item.id}
              </Badge>
            </button>
          ))}
      </div>
    </div>
  );
}
