/**
 * useHospitalities Hook
 * 
 * React hook for fetching and managing hospitality services
 */

import { useState, useEffect } from 'react';
import { getAllHospitalities, type Hospitality } from '../services/hospitalityService';

export const useHospitalities = (activeOnly: boolean = false) => {
  const [hospitalities, setHospitalities] = useState<Hospitality[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitalities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllHospitalities(activeOnly);
      setHospitalities(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch hospitalities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalities();
  }, [activeOnly]);

  return {
    hospitalities,
    loading,
    error,
    refetch: fetchHospitalities
  };
};
