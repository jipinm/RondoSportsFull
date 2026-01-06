/**
 * Validation utilities for checkout forms
 * Provides comprehensive validation for guest data, booking information, and payment details
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Guest data validation schemas
export interface GuestFormData {
  first_name: string;
  last_name: string;
  contact_email: string;
  contact_phone?: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | 'other';
  country_of_residence: string;
  passport_number?: string;
  street_name?: string;
  city?: string;
  zip?: string;
}

export interface UserDetailsFormData {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  houseNumber: string;  // Maps to address_line_1
  zipCode: string;      // Maps to postcode
  city: string;
  country: string;      // Maps to country_code
  phone: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - adjust as needed for specific requirements
  const phoneRegex = /^[+]?[\d\s\-\(\)]{7,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date of birth (must be in the past and person must be at least 13 years old)
 */
export const validateDateOfBirth = (dateString: string): ValidationResult => {
  if (!dateString) {
    return { isValid: false, errors: [{ field: 'date_of_birth', message: 'Date of birth is required' }] };
  }

  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return { isValid: false, errors: [{ field: 'date_of_birth', message: 'Please enter a valid date' }] };
  }

  if (date >= now) {
    return { isValid: false, errors: [{ field: 'date_of_birth', message: 'Date of birth must be in the past' }] };
  }

  // Check minimum age (13 years)
  const minAge = new Date();
  minAge.setFullYear(minAge.getFullYear() - 13);
  
  if (date > minAge) {
    return { isValid: false, errors: [{ field: 'date_of_birth', message: 'Must be at least 13 years old' }] };
  }

  return { isValid: true, errors: [] };
};

/**
 * Validate country code (ISO 3166-1 alpha-3)
 * Updated to match database format after ISO-3 migration
 */
export const validateCountryCode = (countryCode: string): boolean => {
  // Complete list of 3-letter country codes (ISO 3166-1 alpha-3) matching updated database
  const validCountries = [
    'IND', 'USA', 'CAN', 'GBR', 'AUS', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'JPN', 'CHN', 'BRA', 'MEX', 'RUS',
    // Complete comprehensive list of ISO-3 country codes
    'AND', 'ARE', 'AFG', 'ATG', 'AIA', 'ALB', 'ARM', 'AGO', 'ATA', 'ARG', 'ASM', 'AUT', 'ABW', 'ALA', 'AZE',
    'BIH', 'BRB', 'BGD', 'BEL', 'BFA', 'BGR', 'BHR', 'BDI', 'BEN', 'BLM', 'BMU', 'BRN', 'BOL', 'BES', 'BHS',
    'BTN', 'BVT', 'BWA', 'BLR', 'BLZ', 'CCK', 'COD', 'CAF', 'COG', 'CHE', 'CIV', 'COK', 'CHL', 'CMR', 'COL',
    'CRI', 'CUB', 'CPV', 'CUW', 'CXR', 'CYP', 'CZE', 'DJI', 'DNK', 'DMA', 'DOM', 'DZA', 'ECU', 'EST', 'EGY',
    'ESH', 'ERI', 'ETH', 'FIN', 'FJI', 'FLK', 'FSM', 'FRO', 'GAB', 'GRD', 'GEO', 'GUF', 'GGY', 'GHA', 'GIB',
    'GRL', 'GMB', 'GIN', 'GLP', 'GNQ', 'GRC', 'SGS', 'GTM', 'GUM', 'GNB', 'GUY', 'HKG', 'HMD', 'HND', 'HRV',
    'HTI', 'HUN', 'IDN', 'IRL', 'ISR', 'IMN', 'IOT', 'IRQ', 'IRN', 'ISL', 'JEY', 'JAM', 'JOR', 'KEN', 'KGZ',
    'KHM', 'KIR', 'COM', 'KNA', 'PRK', 'KOR', 'KWT', 'CYM', 'KAZ', 'LAO', 'LBN', 'LCA', 'LIE', 'LKA', 'LBR',
    'LSO', 'LTU', 'LUX', 'LVA', 'LBY', 'MAR', 'MCO', 'MDA', 'MNE', 'MAF', 'MDG', 'MHL', 'MKD', 'MLI', 'MMR',
    'MNG', 'MAC', 'MNP', 'MTQ', 'MRT', 'MSR', 'MLT', 'MUS', 'MDV', 'MWI', 'MYS', 'MOZ', 'NAM', 'NCL', 'NER',
    'NFK', 'NGA', 'NIC', 'NOR', 'NPL', 'NRU', 'NIU', 'NZL', 'OMN', 'PAN', 'PER', 'PYF', 'PNG', 'PHL', 'PAK',
    'POL', 'SPM', 'PCN', 'PRI', 'PSE', 'PRT', 'PLW', 'PRY', 'QAT', 'REU', 'ROU', 'SRB', 'RWA', 'SAU', 'SLB',
    'SYC', 'SDN', 'SWE', 'SGP', 'SHN', 'SVN', 'SJM', 'SVK', 'SLE', 'SMR', 'SEN', 'SOM', 'SUR', 'SSD', 'STP',
    'SLV', 'SXM', 'SYR', 'SWZ', 'TCA', 'TCD', 'ATF', 'TGO', 'THA', 'TJK', 'TKL', 'TLS', 'TKM', 'TUN', 'TON',
    'TUR', 'TTO', 'TUV', 'TWN', 'TZA', 'UKR', 'UGA', 'UMI', 'URY', 'UZB', 'VAT', 'VCT', 'VEN', 'VGB', 'VIR',
    'VNM', 'VUT', 'WLF', 'WSM', 'YEM', 'MYT', 'ZAF', 'ZMB', 'ZWE'
  ];
  return validCountries.includes(countryCode.toUpperCase());
};

/**
 * Validate passport number format
 */
export const validatePassportNumber = (passport: string): boolean => {
  if (!passport) return true; // Optional field
  // Basic passport validation - alphanumeric, 6-9 characters
  const passportRegex = /^[A-Z0-9]{6,9}$/i;
  return passportRegex.test(passport);
};

/**
 * Validate individual guest data
 */
export const validateGuestData = (guest: GuestFormData, isLeadGuest: boolean = false): ValidationResult => {
  const errors: ValidationError[] = [];

  // First name is always required
  if (!guest.first_name || guest.first_name.trim().length < 2) {
    errors.push({ field: 'first_name', message: 'First name must be at least 2 characters' });
  }

  // Last name is always required
  if (!guest.last_name || guest.last_name.trim().length < 2) {
    errors.push({ field: 'last_name', message: 'Last name must be at least 2 characters' });
  }

  // Email validation (required for lead guest, optional for others)
  if (isLeadGuest || guest.contact_email) {
    if (!guest.contact_email) {
      if (isLeadGuest) {
        errors.push({ field: 'contact_email', message: 'Email is required for lead guest' });
      }
    } else if (!validateEmail(guest.contact_email)) {
      errors.push({ field: 'contact_email', message: 'Please enter a valid email address' });
    }
  }

  // Phone validation (optional)
  if (guest.contact_phone && !validatePhone(guest.contact_phone)) {
    errors.push({ field: 'contact_phone', message: 'Please enter a valid phone number' });
  }

  // Date of birth validation
  if (guest.date_of_birth) {
    const dobValidation = validateDateOfBirth(guest.date_of_birth);
    if (!dobValidation.isValid) {
      errors.push(...dobValidation.errors);
    }
  }

  // Country of residence validation
  if (!guest.country_of_residence) {
    errors.push({ field: 'country_of_residence', message: 'Country of residence is required' });
  } else if (!validateCountryCode(guest.country_of_residence)) {
    errors.push({ field: 'country_of_residence', message: 'Please select a valid country' });
  }

  // Passport number validation (optional)
  if (guest.passport_number && !validatePassportNumber(guest.passport_number)) {
    errors.push({ field: 'passport_number', message: 'Please enter a valid passport number' });
  }

  // Address validation (if provided)
  if (guest.street_name && guest.street_name.trim().length < 3) {
    errors.push({ field: 'street_name', message: 'Street address must be at least 3 characters' });
  }

  if (guest.city && guest.city.trim().length < 2) {
    errors.push({ field: 'city', message: 'City must be at least 2 characters' });
  }

  if (guest.zip && guest.zip.trim().length < 3) {
    errors.push({ field: 'zip', message: 'Postal code must be at least 3 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user details form
 */
export const validateUserDetails = (userDetails: UserDetailsFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!userDetails.firstName || userDetails.firstName.trim().length < 2) {
    errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
  }

  if (!userDetails.lastName || userDetails.lastName.trim().length < 2) {
    errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
  }

  if (!userDetails.email || !validateEmail(userDetails.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!userDetails.street || userDetails.street.trim().length < 3) {
    errors.push({ field: 'street', message: 'Street address must be at least 3 characters' });
  }

  if (!userDetails.houseNumber || userDetails.houseNumber.trim().length < 1) {
    errors.push({ field: 'houseNumber', message: 'House number is required' });
  }

  if (!userDetails.zipCode || userDetails.zipCode.trim().length < 3) {
    errors.push({ field: 'zipCode', message: 'Postal code must be at least 3 characters' });
  }

  if (!userDetails.city || userDetails.city.trim().length < 2) {
    errors.push({ field: 'city', message: 'City must be at least 2 characters' });
  }

  if (!userDetails.country) {
    errors.push({ field: 'country', message: 'Country is required' });
  }

  // Phone is optional
  // if (!userDetails.phone || !validatePhone(userDetails.phone)) {
  //   errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  // }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate all guests data
 */
export const validateAllGuests = (guests: GuestFormData[]): ValidationResult => {
  const allErrors: ValidationError[] = [];

  guests.forEach((guest, index) => {
    const isLeadGuest = index === 0;
    const validation = validateGuestData(guest, isLeadGuest);
    
    if (!validation.isValid) {
      // Add guest index to field names for identification
      const guestErrors = validation.errors.map(error => ({
        field: `guest_${index}_${error.field}`,
        message: `Guest ${index + 1}: ${error.message}`
      }));
      allErrors.push(...guestErrors);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Transform user details to lead guest data
 */
export const mapUserDetailsToLeadGuest = (
  userDetails: UserDetailsFormData, 
  existingGuestData?: Partial<GuestFormData>
): GuestFormData => {
  return {
    first_name: userDetails.firstName,
    last_name: userDetails.lastName,
    contact_email: existingGuestData?.contact_email || '',
    contact_phone: userDetails.phone,
    date_of_birth: existingGuestData?.date_of_birth || '',
    country_of_residence: userDetails.country,
    street_name: userDetails.street + (userDetails.houseNumber ? ` ${userDetails.houseNumber}` : ''),
    city: userDetails.city,
    zip: userDetails.zipCode,
    gender: existingGuestData?.gender,
    passport_number: existingGuestData?.passport_number
  };
};

/**
 * Check if checkout can proceed (all required validations passed)
 */
export const canProceedToPayment = (
  userDetails: UserDetailsFormData,
  guests: GuestFormData[],
  termsAccepted: boolean
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate user details
  const userValidation = validateUserDetails(userDetails);
  if (!userValidation.isValid) {
    errors.push(...userValidation.errors);
  }

  // Validate all guests
  const guestsValidation = validateAllGuests(guests);
  if (!guestsValidation.isValid) {
    errors.push(...guestsValidation.errors);
  }

  // Check terms acceptance
  if (!termsAccepted) {
    errors.push({ field: 'terms', message: 'You must accept the terms and conditions' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};