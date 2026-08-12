import { useState, useEffect, useCallback } from 'react';
import { getEntityDetail } from '@/lib/api';
import { EntityDetail } from '@/lib/types';

export function useEntityDetail(
  entityType: 'provider' | 'patient',
  entityId: string
) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    setError(null);

    getEntityDetail(entityType, entityId)
      .then((res) => {
        setDetail(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch entity details.');
        setLoading(false);
      });
  }, [entityType, entityId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, error, refetch: fetchDetail };
}
