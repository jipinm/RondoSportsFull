import { customerApiClient } from './customerApiClient';

export interface Country {
  country_code: string;
  country_name: string;
}

export interface CountryResponse {
  success: boolean;
  data: Country[];
  message: string;
}

/**
 * Service for fetching country data
 */
export class CountryService {
  /**
   * Get all active countries
   */
  async getAllCountries(): Promise<Country[]> {
    try {
      const response = await customerApiClient.get<CountryResponse>('/api/v1/countries');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch countries');
      }
    } catch (error: any) {
      console.warn('API not available, using fallback data:', error.message);
      
      // Fallback data for testing when API is not available (updated to ISO-3 format)
      return [
        { country_code: 'USA', country_name: 'United States' },
        { country_code: 'CAN', country_name: 'Canada' },
        { country_code: 'GBR', country_name: 'United Kingdom' },
        { country_code: 'AUS', country_name: 'Australia' },
        { country_code: 'DEU', country_name: 'Germany' },
        { country_code: 'FRA', country_name: 'France' },
        { country_code: 'JPN', country_name: 'Japan' },
        { country_code: 'IND', country_name: 'India' },
        { country_code: 'CHN', country_name: 'China' },
        { country_code: 'BRA', country_name: 'Brazil' },
        { country_code: 'MEX', country_name: 'Mexico' },
        { country_code: 'ITA', country_name: 'Italy' },
        { country_code: 'ESP', country_name: 'Spain' },
        { country_code: 'RUS', country_name: 'Russia' },
        { country_code: 'KOR', country_name: 'South Korea' },
        { country_code: 'NLD', country_name: 'Netherlands' },
        { country_code: 'CHE', country_name: 'Switzerland' },
        { country_code: 'SWE', country_name: 'Sweden' },
        { country_code: 'NOR', country_name: 'Norway' },
        { country_code: 'DNK', country_name: 'Denmark' },
        { country_code: 'FIN', country_name: 'Finland' },
        { country_code: 'BEL', country_name: 'Belgium' },
        { country_code: 'AUT', country_name: 'Austria' },
        { country_code: 'IRL', country_name: 'Ireland' },
        { country_code: 'NZL', country_name: 'New Zealand' },
        { country_code: 'SGP', country_name: 'Singapore' },
        { country_code: 'HKG', country_name: 'Hong Kong' },
        { country_code: 'THA', country_name: 'Thailand' },
        { country_code: 'MYS', country_name: 'Malaysia' },
        { country_code: 'PHL', country_name: 'Philippines' },
      ];
    }
  }

  /**
   * Search countries by name
   */
  async searchCountries(searchTerm: string): Promise<Country[]> {
    try {
      const response = await customerApiClient.get<CountryResponse>(
        `/api/v1/countries/search?q=${encodeURIComponent(searchTerm)}`
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to search countries');
      }
    } catch (error: any) {
      console.warn('API not available, using fallback search:', error.message);
      
      // Fallback: get all countries and filter locally
      const allCountries = await this.getAllCountries();
      return allCountries.filter(country => 
        country.country_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }
}

// Export singleton instance
export const countryService = new CountryService();
export default countryService;