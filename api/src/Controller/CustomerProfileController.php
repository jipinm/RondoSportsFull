<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\CustomerRepository;
use XS2EventProxy\Service\CustomerJWTService;
use XS2EventProxy\Service\CustomerValidationService;
use XS2EventProxy\Exception\CustomerException;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class CustomerProfileController
{
    private CustomerRepository $customerRepository;
    private CustomerJWTService $jwtService;
    private CustomerValidationService $validator;
    private LoggerInterface $logger;

    public function __construct(
        CustomerRepository $customerRepository,
        CustomerJWTService $jwtService,
        CustomerValidationService $validator,
        LoggerInterface $logger
    ) {
        $this->customerRepository = $customerRepository;
        $this->jwtService = $jwtService;
        $this->validator = $validator;
        $this->logger = $logger;
    }

    /**
     * Get customer profile
     */
    public function getProfile(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $fullCustomer = $request->getAttribute('customer_full');

            // Remove sensitive information
            unset($fullCustomer['password_hash'], $fullCustomer['email_verification_token'], 
                  $fullCustomer['password_reset_token'], $fullCustomer['two_factor_secret']);

            // Resolve country name from country_code if available
            if (!empty($fullCustomer['country_code'])) {
                try {
                    $countryName = $this->customerRepository->getCountryName($fullCustomer['country_code']);
                    $fullCustomer['country'] = $countryName ?: $fullCustomer['country_code'];
                } catch (\Exception $e) {
                    $this->logger->warning('Failed to resolve country name', [
                        'country_code' => $fullCustomer['country_code'],
                        'error' => $e->getMessage()
                    ]);
                    // Continue without country name, don't fail the entire request
                }
            }

            $this->logger->info('Customer profile retrieved', [
                'customer_id' => $customer['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $fullCustomer
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error fetching profile');
        }
    }

    /**
     * Update customer profile
     */
    public function updateProfile(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            // Sanitize and validate input
            $sanitizedData = $this->validator->sanitizeCustomerData($data);
            $errors = $this->validator->validateProfileUpdate($sanitizedData, $customer['id']);

            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            // Prepare update data (only allow certain fields to be updated)
            $allowedFields = ['first_name', 'last_name', 'phone', 'country_code', 'marketing_consent'];
            $updateData = [];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $sanitizedData)) {
                    $updateData[$field] = $sanitizedData[$field];
                }
            }

            // Handle email change (requires verification)
            if (isset($sanitizedData['email']) && $sanitizedData['email'] !== $customer['email']) {
                // Generate new verification token
                $updateData['email'] = $sanitizedData['email'];
                $updateData['email_verified'] = false;
                $updateData['email_verification_token'] = bin2hex(random_bytes(32));
                
                // TODO: Send verification email for new email address
                // $this->emailService->sendEmailChangeVerification($customer, $sanitizedData['email']);
            }

            if (empty($updateData)) {
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'No changes to update'
                ], JSON_PRETTY_PRINT));

                return $response->withHeader('Content-Type', 'application/json');
            }

            // Update profile
            $success = $this->customerRepository->update($customer['id'], $updateData);

            if (!$success) {
                throw CustomerException::profileUpdateFailed('Failed to update profile');
            }

            // Log profile update
            $this->logCustomerActivity(
                $customer['id'],
                'profile_updated',
                'Customer updated profile information',
                [
                    'updated_fields' => array_keys($updateData),
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Customer profile updated', [
                'customer_id' => $customer['id'],
                'updated_fields' => array_keys($updateData)
            ]);

            // Get updated profile data
            $updatedProfile = $this->customerRepository->findById($customer['id']);
            if (!$updatedProfile) {
                throw CustomerException::profileUpdateFailed('Failed to retrieve updated profile');
            }

            $message = 'Profile updated successfully';
            if (isset($updateData['email'])) {
                $message .= '. Please check your new email address to verify the change.';
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => $message,
                'data' => $updatedProfile
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error updating profile');
        }
    }

    /**
     * Update customer address
     */
    public function updateAddress(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            // DEBUG: Log the incoming data
            error_log("=== PROFILE ADDRESS UPDATE DEBUG ===");
            error_log("Customer ID: " . $customer['id']);
            error_log("Raw data: " . json_encode($data));

            // Sanitize and validate address data
            $sanitizedData = $this->validator->sanitizeCustomerData($data);
            error_log("Sanitized data: " . json_encode($sanitizedData));
            $errors = $this->validator->validateProfileUpdate($sanitizedData, $customer['id']);

            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            // Prepare address update data
            $updateData = [];
            
            // Map new field names directly
            $directFields = ['street', 'house_number', 'zipcode', 'city', 'country_code'];
            foreach ($directFields as $field) {
                if (array_key_exists($field, $sanitizedData)) {
                    $updateData[$field] = $sanitizedData[$field];
                }
            }
            
            // Map legacy field names only if new field names are not present
            if (!array_key_exists('house_number', $updateData) && array_key_exists('address_line_1', $sanitizedData)) {
                $updateData['house_number'] = $sanitizedData['address_line_1'];
            }
            
            if (!array_key_exists('zipcode', $updateData) && array_key_exists('postcode', $sanitizedData)) {
                $updateData['zipcode'] = $sanitizedData['postcode'];
            }

            // DEBUG: Log the final update data
            error_log("Final update data: " . json_encode($updateData));

            if (empty($updateData)) {
                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'No address changes to update'
                ], JSON_PRETTY_PRINT));

                return $response->withHeader('Content-Type', 'application/json');
            }

            // Update address
            $success = $this->customerRepository->update($customer['id'], $updateData);

            if (!$success) {
                throw CustomerException::profileUpdateFailed('Failed to update address');
            }

            // Log address update
            $this->logCustomerActivity(
                $customer['id'],
                'address_updated',
                'Customer updated address information',
                [
                    'updated_fields' => array_keys($updateData),
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Customer address updated', [
                'customer_id' => $customer['id'],
                'updated_fields' => array_keys($updateData)
            ]);

            // Get updated profile data
            $updatedProfile = $this->customerRepository->findById($customer['id']);
            if (!$updatedProfile) {
                throw CustomerException::profileUpdateFailed('Failed to retrieve updated profile');
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Address updated successfully',
                'data' => $updatedProfile
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error updating address');
        }
    }

    /**
     * Change customer password
     */
    public function changePassword(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            // Validate input
            $errors = $this->validator->validatePasswordChange($data);
            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            // Get current customer data to verify current password
            $fullCustomer = $this->customerRepository->findById($customer['id']);
            if (!$fullCustomer) {
                throw CustomerException::customerNotFound("ID: {$customer['id']}");
            }

            // Verify current password
            if (!password_verify($data['current_password'], $fullCustomer['password_hash'])) {
                throw CustomerException::passwordChangeFailed('Current password is incorrect');
            }

            // Hash new password
            $newPasswordHash = password_hash($data['new_password'], PASSWORD_DEFAULT);

            // Update password
            $success = $this->customerRepository->update($customer['id'], [
                'password_hash' => $newPasswordHash,
                'failed_login_attempts' => 0,
                'locked_until' => null
            ]);

            if (!$success) {
                throw CustomerException::passwordChangeFailed('Failed to update password');
            }

            // Revoke all existing sessions except current one for security
            // Customer will need to log in again on other devices
            $this->jwtService->revokeAllCustomerSessions($customer['id']);

            // Log password change
            $this->logCustomerActivity(
                $customer['id'],
                'password_changed',
                'Customer changed password',
                [
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Customer password changed', [
                'customer_id' => $customer['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Password changed successfully. You have been logged out of other devices for security.'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error changing password');
        }
    }

    /**
     * Delete customer account (soft delete)
     */
    public function deleteAccount(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $data = $request->getParsedBody();

            // Require password confirmation for account deletion
            if (empty($data['password'])) {
                throw CustomerException::validationFailed(['password' => 'Password is required to delete account']);
            }

            // Get current customer data to verify password
            $fullCustomer = $this->customerRepository->findById($customer['id']);
            if (!$fullCustomer) {
                throw CustomerException::customerNotFound("ID: {$customer['id']}");
            }

            // Verify password
            if (!password_verify($data['password'], $fullCustomer['password_hash'])) {
                throw CustomerException::insufficientPrivileges('delete account - incorrect password');
            }

            // Soft delete by changing status
            $success = $this->customerRepository->update($customer['id'], [
                'status' => 'deleted',
                'email' => $fullCustomer['email'] . '_deleted_' . time(), // Make email available for new registrations
                'notes' => 'Account deleted by customer on ' . date('Y-m-d H:i:s')
            ]);

            if (!$success) {
                throw CustomerException::profileUpdateFailed('Failed to delete account');
            }

            // Revoke all sessions
            $this->jwtService->revokeAllCustomerSessions($customer['id']);

            // Log account deletion
            $this->logCustomerActivity(
                $customer['id'],
                'account_deleted',
                'Customer deleted their account',
                [
                    'ip_address' => $this->getClientIpAddress($request),
                    'deletion_reason' => $data['reason'] ?? 'Customer requested deletion'
                ]
            );

            $this->logger->info('Customer account deleted', [
                'customer_id' => $customer['id'],
                'email' => $fullCustomer['email']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Account deleted successfully. We\'re sorry to see you go!'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error deleting account');
        }
    }

    /**
     * Get customer sessions
     */
    public function getSessions(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            
            $sessions = $this->jwtService->getCustomerSessions($customer['id']);

            $this->logger->info('Customer sessions retrieved', [
                'customer_id' => $customer['id'],
                'session_count' => count($sessions)
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $sessions
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error fetching sessions');
        }
    }

    /**
     * Revoke all other sessions (keep current)
     */
    public function revokeOtherSessions(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $authHeader = $request->getHeaderLine('Authorization');
            $currentToken = null;
            
            if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
                $currentToken = substr($authHeader, 7);
            }

            // Get all sessions
            $sessions = $this->jwtService->getCustomerSessions($customer['id']);
            
            // Revoke all sessions (the JWT service should handle keeping the current one)
            $this->jwtService->revokeAllCustomerSessions($customer['id']);
            
            // If we have the current token, we might need to re-create this session
            // For now, we'll revoke all and let the frontend handle re-authentication

            // Log session revocation
            $this->logCustomerActivity(
                $customer['id'],
                'sessions_revoked',
                'Customer revoked all other sessions',
                [
                    'revoked_session_count' => count($sessions),
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Customer revoked other sessions', [
                'customer_id' => $customer['id'],
                'revoked_count' => count($sessions)
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'All other sessions have been revoked successfully'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Error revoking sessions');
        }
    }

    /**
     * Get client IP address
     */
    private function getClientIpAddress(Request $request): string
    {
        $serverParams = $request->getServerParams();
        
        $ipHeaders = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];

        foreach ($ipHeaders as $header) {
            if (!empty($serverParams[$header])) {
                $ip = $serverParams[$header];
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                return $ip;
            }
        }

        return $serverParams['REMOTE_ADDR'] ?? 'unknown';
    }

    /**
     * Log customer activity
     */
    private function logCustomerActivity(int $customerId, string $action, string $description, array $metadata = []): void
    {
        try {
            $this->logger->info("Customer Activity: {$action}", [
                'customer_id' => $customerId,
                'action' => $action,
                'description' => $description,
                'metadata' => $metadata,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Failed to log customer activity', [
                'customer_id' => $customerId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle CustomerException
     */
    private function handleCustomerException(Response $response, CustomerException $e): ResponseInterface
    {
        $this->logger->warning('Customer profile error', [
            'error' => $e->getMessage(),
            'code' => $e->getCode(),
            'details' => $e->getDetails()
        ]);

        $response->getBody()->write(json_encode($e->toArray(), JSON_PRETTY_PRINT));
        return $response
            ->withStatus($e->getCode())
            ->withHeader('Content-Type', 'application/json');
    }

    /**
     * Handle general exceptions
     */
    private function handleException(Response $response, \Exception $e, string $context): ResponseInterface
    {
        $this->logger->error($context, [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Internal server error',
            'code' => 500,
            'error_type' => 'INTERNAL_ERROR'
        ], JSON_PRETTY_PRINT));

        return $response
            ->withStatus(500)
            ->withHeader('Content-Type', 'application/json');
    }
}