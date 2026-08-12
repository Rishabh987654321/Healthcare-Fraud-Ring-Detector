import { useState, useEffect, useCallback } from 'react';
import { getFraudRings } from '@/lib/api';
import { FraudRing } from '@/lib/types';

export function useFraudRings() {
  const [fraudRings, setFraudRings] = useState<FraudRing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRings = useCallback(() => {
    setLoading(true);
    setError(null);
    getFraudRings()
      .then((res) => {
        setFraudRings(res.rings || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load fraud rings.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRings();
  }, [fetchRings]);

  return { fraudRings, loading, error, refetch: fetchRings };
}
