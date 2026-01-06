<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use XS2EventProxy\Repository\CustomerRepository;
use Psr\Log\LoggerInterface;
use Exception;
use PDO;

class CustomerJWTService
{
    private string $secretKey;
    private string $refreshSecretKey;
    private int $accessTokenExpiry;
    private int $refreshTokenExpiry;
    private string $issuer;
    private CustomerRepository $customerRepository;
    private DatabaseService $db;
    private LoggerInterface $logger;

    public function __construct(
        CustomerRepository $customerRepository,
        DatabaseService $db,
        LoggerInterface $logger,
        string $secretKey = null,
        int $accessTokenExpiry = null, // Will be set from environment
        int $refreshTokenExpiry = null // Will be set from environment
    ) {
        $this->customerRepository = $customerRepository;
        $this->db = $db;
        $this->logger = $logger;
        $this->secretKey = $secretKey ?? ($_ENV['JWT_SECRET'] ?? $_ENV['CUSTOMER_JWT_SECRET'] ?? 'customer-jwt-secret-key-change-this');
        $this->refreshSecretKey = $this->secretKey . '-refresh';
        $this->accessTokenExpiry = $accessTokenExpiry ?? (int)($_ENV['JWT_ACCESS_EXPIRY'] ?? 3600); // Default 1 hour
        $this->refreshTokenExpiry = $refreshTokenExpiry ?? (int)($_ENV['JWT_REFRESH_EXPIRY'] ?? 86400); // Default 24 hours
        $this->issuer = $_ENV['APP_URL'] ?? 'rondo-customer-api';
    }

    /**
     * Generate access and refresh tokens for customer
     */
    public function generateTokens(array $customer, ?string $deviceInfo = null, ?string $ipAddress = null): array
    {
        try {
            $issuedAt = time();
            $accessExpiry = $issuedAt + $this->accessTokenExpiry;
            $refreshExpiry = $issuedAt + $this->refreshTokenExpiry;

            // Access token payload
            $accessPayload = [
                'iss' => $this->issuer,
                'aud' => 'rondo-customer',
                'iat' => $issuedAt,
                'exp' => $accessExpiry,
                'sub' => (string)$customer['id'],
                'customer_id' => $customer['customer_id'],
                'email' => $customer['email'],
                'first_name' => $customer['first_name'] ?? null,
                'last_name' => $customer['last_name'] ?? null,
                'status' => $customer['status'],
                'email_verified' => (bool)$customer['email_verified'],
                'type' => 'access'
            ];

            // Refresh token payload
            $refreshPayload = [
                'iss' => $this->issuer,
                'aud' => 'rondo-customer',
                'iat' => $issuedAt,
                'exp' => $refreshExpiry,
                'sub' => (string)$customer['id'],
                'customer_id' => $customer['customer_id'],
                'type' => 'refresh'
            ];

            $accessToken = JWT::encode($accessPayload, $this->secretKey, 'HS256');
            $refreshToken = JWT::encode($refreshPayload, $this->refreshSecretKey, 'HS256');

            // Store session in database
            $this->storeSession((int)$customer['id'], $accessToken, $refreshToken, $accessExpiry, $deviceInfo, $ipAddress);

            $this->logger->info('Customer tokens generated successfully', [
                'customer_id' => $customer['id'],
                'customer_email' => $customer['email']
            ]);

            return [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'access_expires_at' => $accessExpiry,
                'refresh_expires_at' => $refreshExpiry,
                'token_type' => 'Bearer'
            ];
        } catch (Exception $e) {
            $this->logger->error('Error generating customer tokens', [
                'customer_id' => $customer['id'] ?? null,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Validate and decode access token
     */
    public function validateAccessToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, 'HS256'));
            $payload = (array)$decoded;

            // Verify token type
            if (!isset($payload['type']) || $payload['type'] !== 'access') {
                return null;
            }

            // Verify token is still valid in database
            if (!$this->isSessionValid((int)$payload['sub'], $token)) {
                return null;
            }

            // Get fresh customer data to check status
            $customer = $this->customerRepository->findById((int)$payload['sub']);
            if (!$customer) {
                return null;
            }

            // Check if customer is still active
            if ($customer['status'] === 'blocked' || $customer['status'] === 'deleted') {
                $this->revokeAllCustomerSessions((int)$customer['id']);
                return null;
            }

            return [
                'id' => (int)$payload['sub'],
                'customer_id' => $payload['customer_id'],
                'email' => $payload['email'],
                'name' => $payload['name'],
                'status' => $customer['status'], // Use fresh status
                'email_verified' => (bool)$customer['email_verified']
            ];
        } catch (ExpiredException $e) {
            $this->logger->debug('Customer access token expired', ['token' => substr($token, 0, 20) . '...']);
            return null;
        } catch (SignatureInvalidException $e) {
            $this->logger->warning('Invalid customer token signature', ['token' => substr($token, 0, 20) . '...']);
            return null;
        } catch (Exception $e) {
            $this->logger->error('Error validating customer access token', [
                'token' => substr($token, 0, 20) . '...',
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    public function refreshToken(string $refreshToken): ?array
    {
        try {
            $decoded = JWT::decode($refreshToken, new Key($this->refreshSecretKey, 'HS256'));
            $payload = (array)$decoded;

            // Verify token type
            if (!isset($payload['type']) || $payload['type'] !== 'refresh') {
                return null;
            }

            // Get customer data
            $customer = $this->customerRepository->findById((int)$payload['sub']);
            if (!$customer) {
                return null;
            }

            // Check if customer is still active
            if ($customer['status'] === 'blocked' || $customer['status'] === 'deleted') {
                $this->revokeAllCustomerSessions((int)$customer['id']);
                return null;
            }

            // Verify refresh token is valid in database
            if (!$this->isRefreshTokenValid((int)$customer['id'], $refreshToken)) {
                return null;
            }

            // Generate new tokens
            $newTokens = $this->generateTokens($customer);

            // Revoke old refresh token
            $this->revokeRefreshToken($refreshToken);

            $this->logger->info('Customer tokens refreshed successfully', [
                'customer_id' => $customer['id']
            ]);

            return $newTokens;
        } catch (ExpiredException $e) {
            $this->logger->debug('Customer refresh token expired');
            return null;
        } catch (Exception $e) {
            $this->logger->error('Error refreshing customer token', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Revoke customer session (logout)
     */
    public function revokeSession(string $accessToken): bool
    {
        try {
            $tokenHash = hash('sha256', $accessToken);
            
            $stmt = $this->db->getConnection()->prepare(
                "DELETE FROM customer_sessions WHERE token_hash = :token_hash"
            );
            
            $result = $stmt->execute(['token_hash' => $tokenHash]);

            $this->logger->info('Customer session revoked', [
                'token_hash' => substr($tokenHash, 0, 16) . '...'
            ]);

            return $result;
        } catch (Exception $e) {
            $this->logger->error('Error revoking customer session', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Revoke all sessions for a customer
     */
    public function revokeAllCustomerSessions(int $customerId): bool
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "DELETE FROM customer_sessions WHERE customer_id = :customer_id"
            );
            
            $result = $stmt->execute(['customer_id' => $customerId]);

            $this->logger->info('All customer sessions revoked', [
                'customer_id' => $customerId
            ]);

            return $result;
        } catch (Exception $e) {
            $this->logger->error('Error revoking all customer sessions', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Store session in database
     */
    private function storeSession(
        int $customerId, 
        string $accessToken, 
        string $refreshToken, 
        int $expiresAt,
        ?string $deviceInfo = null,
        ?string $ipAddress = null
    ): void {
        try {
            // Clean up expired sessions first
            $this->cleanupExpiredSessions();

            $stmt = $this->db->getConnection()->prepare(
                "INSERT INTO customer_sessions (
                    customer_id, token_hash, refresh_token_hash, 
                    device_info, ip_address, expires_at, created_at
                ) VALUES (
                    :customer_id, :token_hash, :refresh_token_hash,
                    :device_info, :ip_address, FROM_UNIXTIME(:expires_at), NOW()
                )"
            );

            $stmt->execute([
                'customer_id' => $customerId,
                'token_hash' => hash('sha256', $accessToken),
                'refresh_token_hash' => hash('sha256', $refreshToken),
                'device_info' => $deviceInfo,
                'ip_address' => $ipAddress,
                'expires_at' => $expiresAt
            ]);
        } catch (Exception $e) {
            $this->logger->error('Error storing customer session', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Check if session is valid in database
     */
    private function isSessionValid(int $customerId, string $accessToken): bool
    {
        try {
            $tokenHash = hash('sha256', $accessToken);
            
            $stmt = $this->db->getConnection()->prepare(
                "SELECT id FROM customer_sessions 
                 WHERE customer_id = :customer_id 
                 AND token_hash = :token_hash 
                 AND expires_at > NOW()"
            );
            
            $stmt->execute([
                'customer_id' => $customerId,
                'token_hash' => $tokenHash
            ]);

            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (Exception $e) {
            $this->logger->error('Error checking session validity', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Check if refresh token is valid in database
     */
    private function isRefreshTokenValid(int $customerId, string $refreshToken): bool
    {
        try {
            $tokenHash = hash('sha256', $refreshToken);
            
            $stmt = $this->db->getConnection()->prepare(
                "SELECT id FROM customer_sessions 
                 WHERE customer_id = :customer_id 
                 AND refresh_token_hash = :refresh_token_hash"
            );
            
            $stmt->execute([
                'customer_id' => $customerId,
                'refresh_token_hash' => $tokenHash
            ]);

            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (Exception $e) {
            $this->logger->error('Error checking refresh token validity', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Revoke specific refresh token
     */
    private function revokeRefreshToken(string $refreshToken): void
    {
        try {
            $tokenHash = hash('sha256', $refreshToken);
            
            $stmt = $this->db->getConnection()->prepare(
                "DELETE FROM customer_sessions WHERE refresh_token_hash = :refresh_token_hash"
            );
            
            $stmt->execute(['refresh_token_hash' => $tokenHash]);
        } catch (Exception $e) {
            $this->logger->error('Error revoking refresh token', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Cleanup expired sessions
     */
    public function cleanupExpiredSessions(): void
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "DELETE FROM customer_sessions WHERE expires_at < NOW()"
            );
            
            $stmt->execute();
            
            $deletedCount = $stmt->rowCount();
            if ($deletedCount > 0) {
                $this->logger->info('Cleaned up expired customer sessions', [
                    'deleted_count' => $deletedCount
                ]);
            }
        } catch (Exception $e) {
            $this->logger->error('Error cleaning up expired sessions', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get active sessions for a customer
     */
    public function getCustomerSessions(int $customerId): array
    {
        try {
            $stmt = $this->db->getConnection()->prepare(
                "SELECT id, device_info, ip_address, created_at, expires_at 
                 FROM customer_sessions 
                 WHERE customer_id = :customer_id 
                 AND expires_at > NOW()
                 ORDER BY created_at DESC"
            );
            
            $stmt->execute(['customer_id' => $customerId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->logger->error('Error fetching customer sessions', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}