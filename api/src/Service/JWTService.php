<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Exception;
use Psr\Log\LoggerInterface;

/**
 * JWT Service
 * 
 * Handles JWT token generation, validation, and management for admin authentication
 */
class JWTService
{
    private string $secretKey;
    private string $algorithm = 'HS256';
    private int $accessTokenExpiry = 3600; // 1 hour
    private int $refreshTokenExpiry = 604800; // 7 days
    private LoggerInterface $logger;

    public function __construct(LoggerInterface $logger, string $secretKey)
    {
        $this->logger = $logger;
        $this->secretKey = $secretKey;
    }

    /**
     * Generate access token
     * 
     * @param array $payload User data to include in token
     * @return string JWT token
     */
    public function generateAccessToken(array $payload): string
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => $this->algorithm]);
        
        $payload['iat'] = time();
        $payload['exp'] = time() + $this->accessTokenExpiry;
        $payload['type'] = 'access';
        
        $payloadEncoded = json_encode($payload);
        
        $base64Header = $this->base64UrlEncode($header);
        $base64Payload = $this->base64UrlEncode($payloadEncoded);
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
        $base64Signature = $this->base64UrlEncode($signature);
        
        $token = $base64Header . "." . $base64Payload . "." . $base64Signature;
        
        $this->logger->info('Access token generated', [
            'user_id' => $payload['user_id'] ?? null,
            'expires_at' => date('Y-m-d H:i:s', $payload['exp'])
        ]);
        
        return $token;
    }

    /**
     * Generate refresh token
     * 
     * @param int $userId User ID
     * @return string JWT refresh token
     */
    public function generateRefreshToken(int $userId): string
    {
        $payload = [
            'user_id' => $userId,
            'type' => 'refresh',
            'iat' => time(),
            'exp' => time() + $this->refreshTokenExpiry
        ];
        
        $header = json_encode(['typ' => 'JWT', 'alg' => $this->algorithm]);
        $payloadEncoded = json_encode($payload);
        
        $base64Header = $this->base64UrlEncode($header);
        $base64Payload = $this->base64UrlEncode($payloadEncoded);
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
        $base64Signature = $this->base64UrlEncode($signature);
        
        $token = $base64Header . "." . $base64Payload . "." . $base64Signature;
        
        $this->logger->info('Refresh token generated', [
            'user_id' => $userId,
            'expires_at' => date('Y-m-d H:i:s', $payload['exp'])
        ]);
        
        return $token;
    }

    /**
     * Validate JWT token
     * 
     * @param string $token JWT token to validate
     * @return array|null Decoded payload if valid, null if invalid
     */
    public function validateToken(string $token): ?array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                $this->logger->warning('Invalid token format', ['token_parts' => count($parts)]);
                return null;
            }
            
            [$header, $payload, $signature] = $parts;
            
            // Verify signature
            $validSignature = hash_hmac('sha256', $header . "." . $payload, $this->secretKey, true);
            $validSignature = $this->base64UrlEncode($validSignature);
            
            if (!hash_equals($signature, $validSignature)) {
                $this->logger->warning('Token signature verification failed');
                return null;
            }
            
            // Decode payload
            $payloadDecoded = json_decode($this->base64UrlDecode($payload), true);
            
            if (!$payloadDecoded) {
                $this->logger->warning('Token payload decode failed');
                return null;
            }
            
            // Check expiration
            if (!isset($payloadDecoded['exp']) || $payloadDecoded['exp'] < time()) {
                $this->logger->info('Token expired', [
                    'exp' => $payloadDecoded['exp'] ?? null,
                    'current_time' => time()
                ]);
                return null;
            }
            
            // Check issued at time (not in future)
            if (isset($payloadDecoded['iat']) && $payloadDecoded['iat'] > time() + 60) { // 60s tolerance
                $this->logger->warning('Token issued in future', [
                    'iat' => $payloadDecoded['iat'],
                    'current_time' => time()
                ]);
                return null;
            }
            
            return $payloadDecoded;
            
        } catch (Exception $e) {
            $this->logger->error('Token validation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Check if token is expired
     * 
     * @param string $token JWT token
     * @return bool True if expired
     */
    public function isTokenExpired(string $token): bool
    {
        $payload = $this->validateToken($token);
        return $payload === null;
    }

    /**
     * Get token expiry time
     * 
     * @param string $token JWT token
     * @return int|null Unix timestamp of expiry, null if invalid token
     */
    public function getTokenExpiry(string $token): ?int
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }
            
            $payload = json_decode($this->base64UrlDecode($parts[1]), true);
            return $payload['exp'] ?? null;
            
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Base64 URL encode
     * 
     * @param string $data Data to encode
     * @return string Encoded data
     */
    private function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    /**
     * Base64 URL decode
     * 
     * @param string $data Data to decode
     * @return string Decoded data
     */
    private function base64UrlDecode(string $data): string
    {
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }

    /**
     * Set access token expiry time
     * 
     * @param int $seconds Expiry time in seconds
     */
    public function setAccessTokenExpiry(int $seconds): void
    {
        $this->accessTokenExpiry = $seconds;
    }

    /**
     * Set refresh token expiry time
     * 
     * @param int $seconds Expiry time in seconds
     */
    public function setRefreshTokenExpiry(int $seconds): void
    {
        $this->refreshTokenExpiry = $seconds;
    }

    /**
     * Get access token expiry time
     * 
     * @return int Expiry time in seconds
     */
    public function getAccessTokenExpiry(): int
    {
        return $this->accessTokenExpiry;
    }

    /**
     * Get refresh token expiry time
     * 
     * @return int Expiry time in seconds
     */
    public function getRefreshTokenExpiry(): int
    {
        return $this->refreshTokenExpiry;
    }
}