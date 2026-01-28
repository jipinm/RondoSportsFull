/**
 * useEventHospitalities Hook
 * 
 * React hook for fetching and managing hospitality assignments for an event
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getEventHospitalities, 
  type TicketHospitality 
} from '../services/hospitalityService';

export const useEventHospitalities = (eventId: string | undefined) => {
  const [hospitalities, setHospitalities] = useState<TicketHospitality[]>([]);
  const [groupedByTicket, setGroupedByTicket] = useState<Record<string, TicketHospitality[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventHospitalities = useCallback(async () => {
    if (!eventId) {
      setHospitalities([]);
      setGroupedByTicket({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getEventHospitalities(eventId);
      setHospitalities(result.data);
      setGroupedByTicket(result.grouped_by_ticket);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch event hospitalities');
      setHospitalities([]);
      setGroupedByTicket({});
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventHospitalities();
  }, [fetchEventHospitalities]);

  return {
    hospitalities,
    groupedByTicket,
    loading,
    error,
    refetch: fetchEventHospitalities
  };
};
