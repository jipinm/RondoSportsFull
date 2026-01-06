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

class CustomerAuthController
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
     * Customer registration
     */
    public function register(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $ipAddress = $this->getClientIpAddress($request);
            $userAgent = $request->getHeaderLine('User-Agent');

            // Sanitize and validate input
            $sanitizedData = $this->validator->sanitizeCustomerData($data);
            $errors = $this->validator->validateRegistration($sanitizedData);

            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            // Check if email already exists
            $existingCustomer = $this->customerRepository->findByEmail($sanitizedData['email']);
            if ($existingCustomer) {
                throw CustomerException::emailAlreadyExists($sanitizedData['email']);
            }

            // Hash password
            $passwordHash = password_hash($sanitizedData['password'], PASSWORD_DEFAULT);

            // Prepare customer data
            $customerData = [
                'first_name' => $sanitizedData['first_name'],
                'last_name' => $sanitizedData['last_name'],
                'email' => $sanitizedData['email'],
                'phone' => $sanitizedData['phone'] ?? null,
                'country_code' => $sanitizedData['country_code'] ?? null,
                'password_hash' => $passwordHash,
                'street' => $sanitizedData['street'] ?? null,
                'house_number' => $sanitizedData['house_number'] ?? null, // Direct field mapping
                'zipcode' => $sanitizedData['zipcode'] ?? null, // Direct field mapping
                'city' => $sanitizedData['city'] ?? null,
                'status' => 'active', // Set as active since no email verification system
                'email_verified' => true, // Set as verified since no verification system
                'marketing_consent' => $sanitizedData['marketing_consent'] ?? false,
                'email_verification_token' => bin2hex(random_bytes(32))
            ];

            // Create customer
            $customerId = $this->customerRepository->create($customerData);

            // Get created customer data
            $customer = $this->customerRepository->findById($customerId);

            // Log registration activity
            $this->logCustomerActivity(
                $customerId,
                'registration',
                'Customer registered account',
                [
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent,
                    'marketing_consent' => $customerData['marketing_consent']
                ]
            );

            // TODO: Send verification email (implement EmailService)
            // $this->emailService->sendVerificationEmail($customer);

            $this->logger->info('Customer registered successfully', [
                'customer_id' => $customerId,
                'email' => $sanitizedData['email'],
                'ip_address' => $ipAddress
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Registration successful. Please check your email to verify your account.',
                'data' => [
                    'customer_id' => $customer['customer_id'],
                    'email' => $customer['email'],
                    'name' => $customer['name'],
                    'status' => $customer['status']
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Registration failed');
        }
    }

    /**
     * Customer login
     */
    public function login(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            $ipAddress = $this->getClientIpAddress($request);
            $userAgent = $request->getHeaderLine('User-Agent');

            // Validate input
            $errors = $this->validator->validateLogin($data);
            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            $email = strtolower(trim($data['email']));
            $password = $data['password'];

            // Check if account is locked
            if ($this->customerRepository->isAccountLocked($email)) {
                throw CustomerException::accountLocked(new \DateTime('+1 hour'));
            }

            // Find customer
            $customer = $this->customerRepository->findByEmail($email);
            if (!$customer || !password_verify($password, $customer['password_hash'])) {
                // Record failed login attempt
                $this->customerRepository->recordLoginAttempt($email, false, $ipAddress);
                throw CustomerException::invalidCredentials();
            }

            // Check account status
            if ($customer['status'] === 'blocked') {
                throw CustomerException::accountBlocked($customer['blocked_reason']);
            }

            if ($customer['status'] === 'inactive') {
                throw CustomerException::accountInactive();
            }

            if ($customer['status'] === 'deleted') {
                throw CustomerException::customerNotFound($email);
            }

            // For now, allow login even if email is not verified
            // In production, you might want to enforce email verification
            if ($customer['status'] === 'pending_verification') {
                // Optionally throw CustomerException::emailNotVerified();
                // For now, just log it
                $this->logger->info('Customer login with unverified email', [
                    'customer_id' => $customer['id'],
                    'email' => $email
                ]);
            }

            // Generate tokens
            $tokens = $this->jwtService->generateTokens($customer, $userAgent, $ipAddress);

            // Record successful login
            $this->customerRepository->recordLoginAttempt($email, true, $ipAddress);

            // Log login activity
            $this->logCustomerActivity(
                (int)$customer['id'],
                'login',
                'Customer logged in',
                [
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent
                ]
            );

            $this->logger->info('Customer logged in successfully', [
                'customer_id' => $customer['id'],
                'email' => $email,
                'ip_address' => $ipAddress
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'customer' => [
                        'id' => $customer['id'],
                        'customer_id' => $customer['customer_id'],
                        'first_name' => $customer['first_name'] ?? null,
                        'last_name' => $customer['last_name'] ?? null,
                        'email' => $customer['email'],
                        'status' => $customer['status'],
                        'email_verified' => (bool)$customer['email_verified']
                    ],
                    'tokens' => $tokens
                ]
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Login failed');
        }
    }

    /**
     * Customer logout
     */
    public function logout(Request $request, Response $response): ResponseInterface
    {
        try {
            $customer = $request->getAttribute('customer');
            $authHeader = $request->getHeaderLine('Authorization');
            
            if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
                $this->jwtService->revokeSession($token);
            }

            // Log logout activity
            $this->logCustomerActivity(
                (int)$customer['id'],
                'logout',
                'Customer logged out',
                [
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Customer logged out', [
                'customer_id' => $customer['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Logout successful'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Logout failed');
        }
    }

    /**
     * Refresh access token
     */
    public function refreshToken(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            
            if (empty($data['refresh_token'])) {
                throw CustomerException::invalidToken('refresh token');
            }

            $refreshToken = $data['refresh_token'];
            $newTokens = $this->jwtService->refreshToken($refreshToken);

            if (!$newTokens) {
                throw CustomerException::tokenExpired('refresh token');
            }

            $this->logger->info('Customer tokens refreshed');

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Tokens refreshed successfully',
                'data' => $newTokens
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Token refresh failed');
        }
    }

    /**
     * Forgot password - send reset email
     */
    public function forgotPassword(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            
            // Validate input
            $errors = $this->validator->validatePasswordResetRequest($data);
            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            $email = strtolower(trim($data['email']));
            $customer = $this->customerRepository->findByEmail($email);

            // Always return success to prevent email enumeration
            $successMessage = 'If an account with that email exists, you will receive a password reset email shortly.';

            if ($customer) {
                // Generate reset token
                $resetToken = bin2hex(random_bytes(32));
                $resetExpires = date('Y-m-d H:i:s', strtotime('+1 hour'));

                // Update customer with reset token
                $this->customerRepository->update((int)$customer['id'], [
                    'password_reset_token' => $resetToken,
                    'password_reset_expires' => $resetExpires
                ]);

                // Log password reset request
                $this->logCustomerActivity(
                    (int)$customer['id'],
                    'password_reset_request',
                    'Customer requested password reset',
                    [
                        'ip_address' => $this->getClientIpAddress($request)
                    ]
                );

                // TODO: Send password reset email
                // $this->emailService->sendPasswordResetEmail($customer, $resetToken);

                $this->logger->info('Password reset requested', [
                    'customer_id' => $customer['id'],
                    'email' => $email
                ]);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => $successMessage
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Password reset request failed');
        }
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request, Response $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();
            
            // Validate input
            $errors = $this->validator->validatePasswordReset($data);
            if (!empty($errors)) {
                throw CustomerException::validationFailed($errors);
            }

            $token = $data['token'];
            $newPassword = $data['password'];

            // Find customer by reset token
            $customer = $this->customerRepository->findByEmail($data['email'] ?? '');
            
            if (!$customer || 
                $customer['password_reset_token'] !== $token ||
                !$customer['password_reset_expires'] ||
                strtotime($customer['password_reset_expires']) < time()) {
                throw CustomerException::invalidToken('password reset token');
            }

            // Hash new password
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

            // Update password and clear reset token
            $this->customerRepository->update((int)$customer['id'], [
                'password_hash' => $passwordHash,
                'password_reset_token' => null,
                'password_reset_expires' => null,
                'failed_login_attempts' => 0,
                'locked_until' => null
            ]);

            // Revoke all existing sessions for security
            $this->jwtService->revokeAllCustomerSessions((int)$customer['id']);

            // Log password reset
            $this->logCustomerActivity(
                (int)$customer['id'],
                'password_reset_completed',
                'Customer completed password reset',
                [
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Password reset completed', [
                'customer_id' => $customer['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Password reset successful. Please log in with your new password.'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Password reset failed');
        }
    }

    /**
     * Verify email address
     */
    public function verifyEmail(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $token = $queryParams['token'] ?? '';

            if (empty($token)) {
                throw CustomerException::invalidToken('verification token');
            }

            // Find customer by verification token
            $customers = $this->customerRepository->getCustomers(['search' => ''], 1, 1000);
            $customer = null;
            
            foreach ($customers['customers'] as $c) {
                $fullCustomer = $this->customerRepository->findById((int)$c['id']);
                if ($fullCustomer && $fullCustomer['email_verification_token'] === $token) {
                    $customer = $fullCustomer;
                    break;
                }
            }

            if (!$customer) {
                throw CustomerException::invalidToken('verification token');
            }

            // Update customer as verified
            $this->customerRepository->update((int)$customer['id'], [
                'email_verified' => true,
                'status' => 'active',
                'email_verification_token' => null
            ]);

            // Log email verification
            $this->logCustomerActivity(
                (int)$customer['id'],
                'email_verified',
                'Customer verified email address',
                [
                    'ip_address' => $this->getClientIpAddress($request)
                ]
            );

            $this->logger->info('Email verified', [
                'customer_id' => $customer['id'],
                'email' => $customer['email']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Email verified successfully. Your account is now active.'
            ], JSON_PRETTY_PRINT));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (CustomerException $e) {
            return $this->handleCustomerException($response, $e);
        } catch (\Exception $e) {
            return $this->handleException($response, $e, 'Email verification failed');
        }
    }

    /**
     * Get client IP address
     */
    private function getClientIpAddress(Request $request): string
    {
        $serverParams = $request->getServerParams();
        
        // Check for IP from various headers (for proxy/load balancer scenarios)
        $ipHeaders = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];

        foreach ($ipHeaders as $header) {
            if (!empty($serverParams[$header])) {
                $ip = $serverParams[$header];
                // If X-Forwarded-For contains multiple IPs, get the first one
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
            // This would ideally use a dedicated customer activity logger
            // For now, we'll use a simple approach
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
        $this->logger->warning('Customer authentication error', [
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