import { useState } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';

// Define the structure we expect from the API
interface GuestDataResponse {
  guest_data_requirements?: string[][] | string[];
  required_fields?: string[];
  fields?: string[];
}

interface GuestDataRequirement {
  fields: string[];
}

interface UseGuestDataResult {
  requirements: GuestDataRequirement | null;
  loading: boolean;
  error: string | null;
  fetchRequirements: (ticketId: string, countryHint?: string) => Promise<void>;
}

// Essential fields that should always be available for booking
const ESSENTIAL_FIELDS = [
  'first_name',
  'last_name', 
  'contact_email',
  'date_of_birth'
];

export const useGuestData = (): UseGuestDataResult => {
  const [requirements, setRequirements] = useState<GuestDataRequirement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = async (ticketId: string, countryHint?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (countryHint) {
        params.country_hint = countryHint;
      }

      const endpoint = API_ENDPOINTS.GUEST_DATA(ticketId);
      
      try {
        const response = await apiClient.get<GuestDataResponse>(endpoint, params);
        
        // Parse the API response and extract fields
        let extractedFields: string[] = [];
        
        if (response.data) {
          // Try different possible field locations in the response
          if (response.data.guest_data_requirements) {
            if (Array.isArray(response.data.guest_data_requirements)) {
              if (response.data.guest_data_requirements.length > 0) {
                const firstRequirement = response.data.guest_data_requirements[0];
                if (Array.isArray(firstRequirement)) {
                  extractedFields = firstRequirement;
                } else if (typeof firstRequirement === 'string') {
                  extractedFields = response.data.guest_data_requirements as string[];
                }
              }
            }
          } else if (response.data.required_fields) {
            extractedFields = response.data.required_fields;
          } else if (response.data.fields) {
            extractedFields = response.data.fields;
          }
        }
        
        // Ensure we have essential fields regardless of API response
        const finalFields = [...new Set([...ESSENTIAL_FIELDS, ...extractedFields])];
        
        setRequirements({
          fields: finalFields
        });
        
        
      } catch (apiError: any) {
        // If API fails, use essential fields to ensure booking can proceed
        setRequirements({
          fields: ESSENTIAL_FIELDS
        });
        setError(null); // Don't show error to user, just use fallback
      }
      
    } catch (err: any) {
      console.error('Guest data fetch error:', err);
      // Always provide essential fields as absolute fallback
      setRequirements({
        fields: ESSENTIAL_FIELDS
      });
      setError(null); // Don't block the user experience
    } finally {
      setLoading(false);
    }
  };

  return {
    requirements,
    loading,
    error,
    fetchRequirements,
  };
};
