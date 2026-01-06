import { customerApiClient } from '../services/customerApiClient';
import { customerAuthService, ApiValidationError } from '../services/customerAuth';

/**
 * Test API Error Handling
 * This test helps verify that API validation errors are properly processed and displayed
 */
async function testApiErrorHandling() {
  console.log('🧪 Starting API Error Handling Test');
  
  // Test data that should trigger a validation error (duplicate email)
  const testRegistrationData = {
    email: 'existing@example.com', // Use an email that should already exist
    password: 'testpassword123',
    first_name: 'Test',
    last_name: 'User',
    phone: '1234567890',
    country: 'GB'
  };
  
  try {
    console.log('📤 Attempting registration with test data:', testRegistrationData);
    
    const response = await customerAuthService.register(testRegistrationData);
    console.log('❌ Unexpected success - should have failed with validation error:', response);
    
  } catch (error: any) {
    console.log('✅ Expected error caught:', error);
    console.log('🔍 Error type:', error.constructor.name);
    console.log('🔍 Error message:', error.message);
    console.log('🔍 Error responseData:', error.responseData);
    
    if (error instanceof ApiValidationError) {
      console.log('✅ Correctly identified as ApiValidationError');
      console.log('📋 Field errors:', error.fieldErrors);
      
      // Check if email error is properly extracted
      if (error.fieldErrors.email) {
        console.log('✅ Email validation error found:', error.fieldErrors.email);
        
        if (error.fieldErrors.email.includes('already registered')) {
          console.log('🎯 SUCCESS: Proper email validation error detected!');
        } else {
          console.log('⚠️  Email error found but not the expected "already registered" message');
        }
      } else {
        console.log('❌ No email field error found in ApiValidationError');
      }
    } else {
      console.log('🔍 Not an ApiValidationError, checking for other error formats...');
      
      // Check if it's a general error with validation details
      if (error.responseData && error.responseData.details) {
        console.log('✅ Found responseData.details:', error.responseData.details);
        
        if (error.responseData.details.email) {
          console.log('✅ Email error in details:', error.responseData.details.email);
        }
      } else {
        console.log('❌ No responseData.details found in error');
      }
    }
  }
}

/**
 * Test Direct API Client
 * Test the customerApiClient directly to see raw API response
 */
async function testDirectApiClient() {
  console.log('\n🧪 Testing Direct API Client');
  
  const testData = {
    email: 'existing@example.com',
    password: 'testpassword123',
    first_name: 'Test',
    last_name: 'User'
  };
  
  try {
    console.log('📤 Making direct API call...');
    
    const response = await customerApiClient.post('/api/v1/customers/auth/register', testData);
    console.log('❌ Unexpected success:', response);
    
  } catch (error: any) {
    console.log('✅ Expected error from API client:', error);
    console.log('🔍 Error message:', error.message);
    console.log('🔍 Error responseData:', error.responseData);
    console.log('🔍 Error status:', error.status);
    
    if (error.responseData) {
      console.log('📄 Full responseData structure:', JSON.stringify(error.responseData, null, 2));
      
      if (error.responseData.details) {
        console.log('✅ Found validation details:', error.responseData.details);
        
        Object.entries(error.responseData.details).forEach(([field, message]) => {
          console.log(`  🔸 ${field}: ${message}`);
        });
      }
    }
  }
}

// Export test functions for console usage
(window as any).testApiErrorHandling = testApiErrorHandling;
(window as any).testDirectApiClient = testDirectApiClient;

console.log('🧪 API Error Handling Tests loaded!');
console.log('📝 Run these in the browser console:');
console.log('   testApiErrorHandling() - Test full error handling chain');
console.log('   testDirectApiClient() - Test API client directly');