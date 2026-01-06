<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use XS2EventProxy\Repository\CustomerRepository;
use Psr\Log\LoggerInterface;

class CustomerValidationService
{
    private CustomerRepository $customerRepository;
    private LoggerInterface $logger;

    public function __construct(CustomerRepository $customerRepository, LoggerInterface $logger)
    {
        $this->customerRepository = $customerRepository;
        $this->logger = $logger;
    }

    /**
     * Validate customer registration data
     */
    public function validateRegistration(array $data): array
    {
        $errors = [];

        // First name validation
        if (empty($data['first_name'])) {
            $errors['first_name'] = 'First name is required';
        } elseif (strlen($data['first_name']) < 1) {
            $errors['first_name'] = 'First name must be at least 1 character';
        } elseif (strlen($data['first_name']) > 255) {
            $errors['first_name'] = 'First name must not exceed 255 characters';
        } elseif (!preg_match('/^[a-zA-Z\s\.\-\']+$/u', $data['first_name'])) {
            $errors['first_name'] = 'First name contains invalid characters';
        }

        // Last name validation
        if (empty($data['last_name'])) {
            $errors['last_name'] = 'Last name is required';
        } elseif (strlen($data['last_name']) < 1) {
            $errors['last_name'] = 'Last name must be at least 1 character';
        } elseif (strlen($data['last_name']) > 255) {
            $errors['last_name'] = 'Last name must not exceed 255 characters';
        } elseif (!preg_match('/^[a-zA-Z\s\.\-\']+$/u', $data['last_name'])) {
            $errors['last_name'] = 'Last name contains invalid characters';
        }

        // Email validation
        if (empty($data['email'])) {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        } elseif (strlen($data['email']) > 255) {
            $errors['email'] = 'Email must not exceed 255 characters';
        } else {
            // Check if email already exists
            $existingCustomer = $this->customerRepository->findByEmail($data['email']);
            if ($existingCustomer) {
                $errors['email'] = 'Email is already registered';
            }
        }

        // Password validation
        if (empty($data['password'])) {
            $errors['password'] = 'Password is required';
        } else {
            $passwordErrors = $this->validatePasswordStrength($data['password']);
            if (!empty($passwordErrors)) {
                $errors['password'] = implode(', ', $passwordErrors);
            }
        }

        // Confirm password validation
        if (empty($data['confirm_password'])) {
            $errors['confirm_password'] = 'Password confirmation is required';
        } elseif ($data['password'] !== $data['confirm_password']) {
            $errors['confirm_password'] = 'Passwords do not match';
        }

        // Phone validation (optional)
        if (!empty($data['phone'])) {
            if (!preg_match('/^[\+]?[0-9\s\-\(\)]{10,20}$/', $data['phone'])) {
                $errors['phone'] = 'Invalid phone number format';
            }
        }

        // Country code validation (optional - ISO country code for address)
        if (!empty($data['country_code'])) {
            // Validate ISO country code format (2-3 letter codes like US, GB, UAE)
            if (!preg_match('/^[A-Z]{2,3}$/', $data['country_code'])) {
                $errors['country_code'] = 'Invalid country code format. Expected 2-3 letter ISO code (e.g., US, GB, UAE)';
            }
        }

        // Phone country code validation (if phone is provided)
        if (!empty($data['phone']) && !empty($data['phone_country_code'])) {
            if (!preg_match('/^\+[1-9]\d{1,4}$/', $data['phone_country_code'])) {
                $errors['phone_country_code'] = 'Invalid phone country code format';
            }
        }

        // Address validation (optional)
        if (!empty($data['house_number'])) {
            if (strlen($data['house_number']) > 50) {
                $errors['house_number'] = 'House number must not exceed 50 characters';
            } elseif (!preg_match('/^[a-zA-Z0-9\s\.\-\/]+$/u', $data['house_number'])) {
                $errors['house_number'] = 'Invalid house number format';
            }
        }

        if (!empty($data['street']) && strlen($data['street']) > 255) {
            $errors['street'] = 'Street must not exceed 255 characters';
        }

        if (!empty($data['zipcode'])) {
            if (strlen($data['zipcode']) > 20) {
                $errors['zipcode'] = 'ZIP code must not exceed 20 characters';
            } elseif (!preg_match('/^[A-Z0-9\s\-]{3,20}$/i', $data['zipcode'])) {
                $errors['zipcode'] = 'Invalid ZIP code format';
            }
        }

        if (!empty($data['locality']) && strlen($data['locality']) > 255) {
            $errors['locality'] = 'Locality must not exceed 255 characters';
        }

        // Terms acceptance validation
        if (empty($data['accept_terms']) || !$data['accept_terms']) {
            $errors['accept_terms'] = 'You must accept the terms and conditions';
        }

        return $errors;
    }

    /**
     * Validate customer profile update data
     */
    public function validateProfileUpdate(array $data, int $customerId): array
    {
        $errors = [];

        // Name validation (split name fields)
        if (isset($data['first_name'])) {
            if (empty($data['first_name'])) {
                $errors['first_name'] = 'First name cannot be empty';
            } elseif (strlen($data['first_name']) < 2) {
                $errors['first_name'] = 'First name must be at least 2 characters';
            } elseif (strlen($data['first_name']) > 255) {
                $errors['first_name'] = 'First name must not exceed 255 characters';
            } elseif (!preg_match('/^[a-zA-Z\s\.\-\']+$/u', $data['first_name'])) {
                $errors['first_name'] = 'First name contains invalid characters';
            }
        }

        if (isset($data['last_name'])) {
            if (empty($data['last_name'])) {
                $errors['last_name'] = 'Last name cannot be empty';
            } elseif (strlen($data['last_name']) < 2) {
                $errors['last_name'] = 'Last name must be at least 2 characters';
            } elseif (strlen($data['last_name']) > 255) {
                $errors['last_name'] = 'Last name must not exceed 255 characters';
            } elseif (!preg_match('/^[a-zA-Z\s\.\-\']+$/u', $data['last_name'])) {
                $errors['last_name'] = 'Last name contains invalid characters';
            }
        }

        // Email validation (if provided)
        if (isset($data['email'])) {
            if (empty($data['email'])) {
                $errors['email'] = 'Email cannot be empty';
            } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Invalid email format';
            } elseif (strlen($data['email']) > 255) {
                $errors['email'] = 'Email must not exceed 255 characters';
            } else {
                // Check if email already exists (excluding current customer)
                $existingCustomer = $this->customerRepository->findByEmail($data['email']);
                if ($existingCustomer && (int)$existingCustomer['id'] !== $customerId) {
                    $errors['email'] = 'Email is already in use by another account';
                }
            }
        }

        // Phone validation (if provided)
        if (isset($data['phone']) && !empty($data['phone'])) {
            if (!preg_match('/^[\+]?[0-9\s\-\(\)]{10,20}$/', $data['phone'])) {
                $errors['phone'] = 'Invalid phone number format';
            }
        }

        // Country code validation (if provided - ISO country code for address)
        if (isset($data['country_code']) && !empty($data['country_code'])) {
            // Validate ISO country code format (2-3 letter codes like US, GB, UAE)
            if (!preg_match('/^[A-Z]{2,3}$/', $data['country_code'])) {
                $errors['country_code'] = 'Invalid country code format. Expected 2-3 letter ISO code (e.g., US, GB, UAE)';
            }
        }

        // Address validation
        $addressFields = ['street', 'house_number', 'city'];
        foreach ($addressFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (strlen($data[$field]) > 255) {
                    $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' must not exceed 255 characters';
                }
                // Special validation for house_number - allow alphanumeric
                if ($field === 'house_number' && !preg_match('/^[a-zA-Z0-9\s\.\-\/]+$/u', $data[$field])) {
                    $errors[$field] = 'House number contains invalid characters';
                }
                // Special validation for street and city - allow letters, spaces, and common punctuation
                elseif (in_array($field, ['street', 'city']) && !preg_match('/^[a-zA-Z0-9\s\.\-\']+$/u', $data[$field])) {
                    $errors[$field] = ucfirst($field) . ' contains invalid characters';
                }
            }
        }

        // ZIP code validation (new field name)
        if (isset($data['zipcode']) && !empty($data['zipcode'])) {
            if (strlen($data['zipcode']) > 20) {
                $errors['zipcode'] = 'ZIP code must not exceed 20 characters';
            } elseif (!preg_match('/^[A-Z0-9\s\-]{3,20}$/i', $data['zipcode'])) {
                $errors['zipcode'] = 'Invalid ZIP code format';
            }
        }

        // Legacy postcode validation (for backward compatibility)
        if (isset($data['postcode']) && !empty($data['postcode'])) {
            if (strlen($data['postcode']) > 20) {
                $errors['postcode'] = 'Postcode must not exceed 20 characters';
            } elseif (!preg_match('/^[A-Z0-9\s\-]{3,20}$/i', $data['postcode'])) {
                $errors['postcode'] = 'Invalid postcode format';
            }
        }



        return $errors;
    }

    /**
     * Validate password change data
     */
    public function validatePasswordChange(array $data): array
    {
        $errors = [];

        // Current password validation
        if (empty($data['current_password'])) {
            $errors['current_password'] = 'Current password is required';
        }

        // New password validation
        if (empty($data['new_password'])) {
            $errors['new_password'] = 'New password is required';
        } else {
            $passwordErrors = $this->validatePasswordStrength($data['new_password']);
            if (!empty($passwordErrors)) {
                $errors['new_password'] = implode(', ', $passwordErrors);
            }

            // Check if new password is different from current
            if (!empty($data['current_password']) && $data['new_password'] === $data['current_password']) {
                $errors['new_password'] = 'New password must be different from current password';
            }
        }

        // Confirm new password validation
        if (empty($data['confirm_new_password'])) {
            $errors['confirm_new_password'] = 'Password confirmation is required';
        } elseif ($data['new_password'] !== $data['confirm_new_password']) {
            $errors['confirm_new_password'] = 'New passwords do not match';
        }

        return $errors;
    }

    /**
     * Validate login data
     */
    public function validateLogin(array $data): array
    {
        $errors = [];

        // Email validation
        if (empty($data['email'])) {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }

        // Password validation
        if (empty($data['password'])) {
            $errors['password'] = 'Password is required';
        }

        return $errors;
    }

    /**
     * Validate password reset request data
     */
    public function validatePasswordResetRequest(array $data): array
    {
        $errors = [];

        // Email validation
        if (empty($data['email'])) {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }

        return $errors;
    }

    /**
     * Validate password reset data
     */
    public function validatePasswordReset(array $data): array
    {
        $errors = [];

        // Token validation
        if (empty($data['token'])) {
            $errors['token'] = 'Reset token is required';
        }

        // New password validation
        if (empty($data['password'])) {
            $errors['password'] = 'New password is required';
        } else {
            $passwordErrors = $this->validatePasswordStrength($data['password']);
            if (!empty($passwordErrors)) {
                $errors['password'] = implode(', ', $passwordErrors);
            }
        }

        // Confirm password validation
        if (empty($data['confirm_password'])) {
            $errors['confirm_password'] = 'Password confirmation is required';
        } elseif ($data['password'] !== $data['confirm_password']) {
            $errors['confirm_password'] = 'Passwords do not match';
        }

        return $errors;
    }

    /**
     * Validate password strength
     */
    private function validatePasswordStrength(string $password): array
    {
        $errors = [];

        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long';
        }

        if (strlen($password) > 128) {
            $errors[] = 'Password must not exceed 128 characters';
        }

        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\?]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        // Check for common weak passwords
        $weakPasswords = [
            'password', '12345678', 'qwerty123', 'abc12345', 
            'password123', '123456789', 'welcome123'
        ];

        if (in_array(strtolower($password), $weakPasswords)) {
            $errors[] = 'Password is too common, please choose a stronger password';
        }

        return $errors;
    }

    /**
     * Validate customer status update (for admin use)
     */
    public function validateStatusUpdate(array $data): array
    {
        $errors = [];

        // Status validation
        if (empty($data['status'])) {
            $errors['status'] = 'Status is required';
        } else {
            $allowedStatuses = ['active', 'inactive', 'blocked', 'pending_verification'];
            if (!in_array($data['status'], $allowedStatuses)) {
                $errors['status'] = 'Invalid status value';
            }
        }

        // Reason validation for blocked status
        if (!empty($data['status']) && $data['status'] === 'blocked') {
            if (empty($data['reason'])) {
                $errors['reason'] = 'Reason is required when blocking a customer';
            } elseif (strlen($data['reason']) > 1000) {
                $errors['reason'] = 'Reason must not exceed 1000 characters';
            }
        }

        return $errors;
    }

    /**
     * Sanitize customer data
     */
    public function sanitizeCustomerData(array $data): array
    {
        $sanitized = [];

        // String fields that need trimming and sanitization
        $stringFields = [
            'first_name', 'last_name', 'email', 'phone', 'street', 'house_number',
            'zipcode', 'city', 'country_code'
        ];

        foreach ($stringFields as $field) {
            if (isset($data[$field])) {
                $sanitized[$field] = trim(htmlspecialchars($data[$field], ENT_QUOTES, 'UTF-8'));
                // Remove empty strings
                if ($sanitized[$field] === '') {
                    $sanitized[$field] = null;
                }
            }
        }

        // Email normalization
        if (isset($sanitized['email'])) {
            $sanitized['email'] = strtolower($sanitized['email']);
        }

        // Phone number normalization
        if (isset($sanitized['phone'])) {
            $sanitized['phone'] = preg_replace('/[^\+0-9]/', '', $sanitized['phone']);
        }

        // Zipcode normalization
        if (isset($sanitized['zipcode'])) {
            $sanitized['zipcode'] = strtoupper($sanitized['zipcode']);
        }

        // Boolean fields
        if (isset($data['marketing_consent'])) {
            $sanitized['marketing_consent'] = (bool)$data['marketing_consent'];
        }

        if (isset($data['accept_terms'])) {
            $sanitized['accept_terms'] = (bool)$data['accept_terms'];
        }

        // Keep password fields as-is (they'll be hashed separately)
        if (isset($data['password'])) {
            $sanitized['password'] = $data['password'];
        }

        if (isset($data['confirm_password'])) {
            $sanitized['confirm_password'] = $data['confirm_password'];
        }

        return $sanitized;
    }
}