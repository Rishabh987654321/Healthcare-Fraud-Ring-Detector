import { useState, useEffect, useCallback } from 'react';
import { getEntityNetwork } from '@/lib/api';
import { NetworkGraphData } from '@/lib/types';

export function useEntityNetwork(
  selectedEntity: { type: 'provider' | 'patient'; id: string } | null,
  depth: number
) {
  const [data, setData] = useState<NetworkGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = useCallback(() => {
    if (!selectedEntity) return;
    setLoading(true);
    setError(null);

    getEntityNetwork(selectedEntity.type, selectedEntity.id, depth)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load entity network.');
        setLoading(false);
      });
  }, [selectedEntity, depth]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  return { data, loading, error, refetch: fetchNetwork };
}
