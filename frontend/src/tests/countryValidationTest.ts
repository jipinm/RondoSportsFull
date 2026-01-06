import { validateCountryCode, validateAllGuests } from '../utils/validation';
import type { GuestFormData } from '../utils/validation';

// Test the validation fix
console.log('=== Country Validation Test ===');

// Test country codes from our database
const testCodes = ['IN', 'US', 'GB', 'DE', 'CA', 'AU', 'FR', 'IT', 'ES', 'NL'];

console.log('Testing database country codes:');
testCodes.forEach(code => {
  const isValid = validateCountryCode(code);
  console.log(`${code}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
});

// Test case sensitivity
console.log('\nTesting case sensitivity:');
console.log(`'in' (lowercase): ${validateCountryCode('in') ? '✅ VALID' : '❌ INVALID'}`);
console.log(`'IN' (uppercase): ${validateCountryCode('IN') ? '✅ VALID' : '❌ INVALID'}`);

// Test a complete guest with pre-filled data (simulating logged-in user)
console.log('\n=== Guest Validation Test ===');

const mockLeadGuest: GuestFormData = {
  first_name: 'John',
  last_name: 'Doe',
  contact_email: 'john.doe@example.com',
  contact_phone: '+1234567890',
  date_of_birth: '1990-01-01',
  country_of_residence: 'IN', // Pre-filled from user profile
  street_name: 'Main Street 123',
  city: 'Mumbai',
  zip: '400001',
  gender: 'male',
  passport_number: 'A1234567'
};

const validationResult = validateAllGuests([mockLeadGuest]);

console.log('Lead guest validation:');
console.log(`Valid: ${validationResult.isValid ? '✅ YES' : '❌ NO'}`);
if (!validationResult.isValid) {
  console.log('Errors:', validationResult.errors);
} else {
  console.log('✅ All validations passed!');
}

export {};