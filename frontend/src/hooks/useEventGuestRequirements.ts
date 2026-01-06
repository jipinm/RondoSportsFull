import { useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS, type EventGuestRequirements, type EventGuestRequirementsApiResponse } from '../services/apiRoutes';

interface UseEventGuestRequirementsResult {
  requirements: EventGuestRequirements | null;
  loading: boolean;
  error: string | null;
  fetchRequirements: (eventId: string) => Promise<void>;
  clearRequirements: () => void;
}

/**
 * Hook for fetching guest data requirements for a specific event
 * Used in Phase 1: Pre-Booking Preparation to show users what data will be required
 */
export const useEventGuestRequirements = (): UseEventGuestRequirementsResult => {
  const [requirements, setRequirements] = useState<EventGuestRequirements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = useCallback(async (eventId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);


      const response = await apiClient.get<EventGuestRequirementsApiResponse>(
        API_ENDPOINTS.EVENT_GUEST_REQUIREMENTS(eventId)
      );


      // Transform the API response to our internal structure
      const transformedRequirements: EventGuestRequirements = {
        event_id: eventId,
        requirements: response.data.guest_data_requirements
          .filter((req: string) => !['all_persons', 'pre_download', 'pre_checkout'].includes(req))
          .map((fieldName: string) => ({
            field: fieldName,
            required: true,
            condition: response.data.guest_data_requirements.includes('pre_download') ? 'pre_download' : 'pre_checkout' as const,
            scope: response.data.guest_data_requirements.includes('all_persons') ? 'all_persons' : 
                   fieldName === 'contact_email' ? 'lead_guest' : 'all_persons' as const,
            type: fieldName.includes('email') ? 'email' : 
                  fieldName.includes('date') ? 'date' : 'string' as const
          })),
        estimated_per_ticket_fields: response.data.guest_data_requirements
          .filter((req: string) => !['all_persons', 'pre_download', 'pre_checkout'].includes(req)).length,
        estimated_total_fields: response.data.guest_data_requirements
          .filter((req: string) => !['all_persons', 'pre_download', 'pre_checkout'].includes(req)).length
      };


      setRequirements(transformedRequirements);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch guest requirements';
      setError(errorMessage);
      console.error('Failed to fetch event guest requirements:', err);
      
      // Set a fallback requirements structure if API fails
      // This ensures the booking flow can continue even if requirements check fails
      setRequirements({
        event_id: eventId,
        requirements: [
          {
            field: 'first_name',
            required: true,
            condition: 'pre_checkout',
            scope: 'all_persons',
            type: 'string'
          },
          {
            field: 'last_name',
            required: true,
            condition: 'pre_checkout',
            scope: 'all_persons',
            type: 'string'
          },
          {
            field: 'contact_email',
            required: true,
            condition: 'pre_checkout',
            scope: 'lead_guest',
            type: 'email'
          }
        ],
        estimated_per_ticket_fields: 2,
        estimated_total_fields: 3
      });
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since the function doesn't depend on any changing values

  const clearRequirements = () => {
    setRequirements(null);
    setError(null);
  };

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
    clearRequirements
  };
};

export default useEventGuestRequirements;