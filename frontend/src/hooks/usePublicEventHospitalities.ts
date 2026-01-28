/**
 * usePublicEventHospitalities Hook
 * 
 * React hook for fetching hospitality services available for tickets in an event (public API)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getPublicEventHospitalities, 
  type PublicTicketHospitality 
} from '../services/hospitalityService';

export interface HospitalityOption {
  id: number;
  hospitality_id: number;
  name: string;
  description: string | null;
  price_usd: number;
  effective_price_usd: number;
}

export const usePublicEventHospitalities = (eventId: string | undefined) => {
  const [hospitalities, setHospitalities] = useState<PublicTicketHospitality[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitalities = useCallback(async () => {
    if (!eventId) {
      setHospitalities([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[Hospitalities] Fetching for event:', eventId);
      const result = await getPublicEventHospitalities(eventId);
      console.log('[Hospitalities] Received:', result);
      setHospitalities(result);
    } catch (err: any) {
      console.error('[Hospitalities] Error:', err);
      setError(err.message || 'Failed to fetch hospitalities');
      setHospitalities([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchHospitalities();
  }, [fetchHospitalities]);

  // Group hospitalities by ticket_id for easy lookup
  const hospitalitiesByTicket = useMemo(() => {
    const map = new Map<string, HospitalityOption[]>();
    
    console.log('[Hospitalities] Grouping by ticket. Raw data:', hospitalities);
    
    hospitalities.forEach(h => {
      const existing = map.get(h.ticket_id) || [];
      existing.push({
        id: h.id,
        hospitality_id: h.hospitality_id,
        name: h.name,
        description: h.description,
        price_usd: h.base_price_usd,
        effective_price_usd: h.effective_price_usd
      });
      map.set(h.ticket_id, existing);
    });
    
    console.log('[Hospitalities] Mapped by ticket:', [...map.entries()]);
    
    return map;
  }, [hospitalities]);

  // Check if a ticket has any hospitalities
  const ticketHasHospitalities = useCallback((ticketId: string): boolean => {
    return hospitalitiesByTicket.has(ticketId);
  }, [hospitalitiesByTicket]);

  // Get hospitalities for a specific ticket
  const getHospitalitiesForTicket = useCallback((ticketId: string): HospitalityOption[] => {
    return hospitalitiesByTicket.get(ticketId) || [];
  }, [hospitalitiesByTicket]);

  return {
    hospitalities,
    hospitalitiesByTicket,
    loading,
    error,
    refetch: fetchHospitalities,
    ticketHasHospitalities,
    getHospitalitiesForTicket
  };
};
