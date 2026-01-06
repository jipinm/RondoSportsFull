/**
 * Test file to verify API logging functionality
 * This file can be used to manually test API calls and verify logging
 */

import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';

// Test function to verify API logging
export const testApiLogging = async () => {
  
  try {
    // Test GET request with no parameters
    await apiClient.get(API_ENDPOINTS.SPORTS);
    
    // Test GET request with parameters
    await apiClient.get(API_ENDPOINTS.TOURNAMENTS, {
      sport_type: 'soccer',
      date_stop: 'ge:2025-07-30'
    });
    
    // Test POST request (this might fail but will show logging)
    try {
      await apiClient.post(API_ENDPOINTS.RESERVATIONS, {
        tickets: [{ ticket_id: 'test', quantity: 1 }],
        guests: [{ 
          first_name: 'Test', 
          last_name: 'User',
          contact_email: 'test@example.com',
          date_of_birth: '1990-01-01',
          lead_guest: true
        }]
      });
    } catch (error) {
      // Expected error for test POST request
    }
    
  } catch (error) {
    // API logging test failed
  }
};

// Function to log current environment configuration
export const logEnvironmentConfig = () => {
  return {
    baseUrl: import.meta.env.VITE_XS2EVENT_BASE_URL,
    apiKeyPresent: !!import.meta.env.VITE_XS2EVENT_API_KEY,
    apiKeyPrefix: import.meta.env.VITE_XS2EVENT_API_KEY?.substring(0, 8) + '...',
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD
  };
};

// Auto-run environment logging when this file is imported
logEnvironmentConfig();
