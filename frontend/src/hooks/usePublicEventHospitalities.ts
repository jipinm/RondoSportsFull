/**
 * usePublicEventHospitalities Hook
 * 
 * Fetches hierarchically resolved hospitality services for tickets in an event.
 * Hospitalities are admin-assigned, ticket-inclusive, and price-independent.
 * Uses the 5-level hierarchy: sport > tournament > team > event > ticket.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getResolvedEventHospitalities, 
  type ResolvedHospitality 
} from '../services/hospitalityService';

/** Simplified hospitality option — no pricing fields */
export interface HospitalityOption {
  hospitality_id: number;
  name: string;
  description: string | null;
  level: string;
}

export const usePublicEventHospitalities = (
  eventId: string | undefined,
  sportType?: string,
  ticketIds?: string[],
  tournamentId?: string | null,
  teamId?: string | null
) => {
  const [hospitalitiesByTicket, setHospitalitiesByTicket] = useState<Map<string, HospitalityOption[]>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitalities = useCallback(async () => {
    if (!eventId || !sportType || !ticketIds || ticketIds.length === 0) {
      setHospitalitiesByTicket(new Map());
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getResolvedEventHospitalities(
        eventId, sportType, ticketIds, tournamentId, teamId
      );

      // Convert the object map into Map<string, HospitalityOption[]>
      const map = new Map<string, HospitalityOption[]>();
      for (const [ticketId, hospitalities] of Object.entries(result)) {
        const options: HospitalityOption[] = (hospitalities as ResolvedHospitality[]).map(h => ({
          hospitality_id: h.hospitality_id,
          name: h.hospitality_name,
          description: h.hospitality_description,
          level: h.level,
        }));
        if (options.length > 0) {
          map.set(ticketId, options);
        }
      }
      setHospitalitiesByTicket(map);
    } catch (err: any) {
      console.error('[Hospitalities] Error:', err);
      setError(err.message || 'Failed to fetch hospitalities');
      setHospitalitiesByTicket(new Map());
    } finally {
      setLoading(false);
    }
  }, [eventId, sportType, ticketIds?.join(','), tournamentId, teamId]);

  useEffect(() => {
    fetchHospitalities();
  }, [fetchHospitalities]);

  // Check if a ticket has any hospitalities
  const ticketHasHospitalities = useCallback((ticketId: string): boolean => {
    return hospitalitiesByTicket.has(ticketId);
  }, [hospitalitiesByTicket]);

  // Get hospitalities for a specific ticket
  const getHospitalitiesForTicket = useCallback((ticketId: string): HospitalityOption[] => {
    return hospitalitiesByTicket.get(ticketId) || [];
  }, [hospitalitiesByTicket]);

  return {
    hospitalitiesByTicket,
    loading,
    error,
    refetch: fetchHospitalities,
    ticketHasHospitalities,
    getHospitalitiesForTicket
  };
};
