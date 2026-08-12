import { useState, useEffect, useCallback } from 'react';
import { searchEntities } from '@/lib/api';
import { SearchResult } from '@/lib/types';

export function useEntitySearch(
  query: string,
  filterType: 'all' | 'provider' | 'patient'
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const executeSearch = useCallback(() => {
    setLoading(true);
    setErrorDetail(null);

    searchEntities(query, filterType)
      .then((res) => {
        setResults(res.results || []);
        setLoading(false);
      })
      .catch((err) => {
        setErrorDetail(err.message || 'Failed to search entities.');
        setLoading(false);
      });
  }, [query, filterType]);

  useEffect(() => {
    if (!query.trim()) {
      executeSearch();
      return;
    }

    const handler = setTimeout(() => {
      executeSearch();
    }, 300);

    return () => clearTimeout(handler);
  }, [query, filterType, executeSearch]);

  return { results, loading, errorDetail, executeSearch };
}
