<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\DatabaseService;

/**
 * Admin User Repository
 * 
 * Handles database operations for admin_users table
 * Updated to work with existing schema (uses 'name' instead of first_name/last_name)
 */
class AdminUserRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Find user by ID
     */
    public function findById(int $id): ?array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, 
                    email, 
                    password_hash, 
                    name,
                    role, 
                    status, 
                    failed_login_attempts, 
                    locked_until, 
                    last_login_at,
                    password_changed_at,
                    created_at, 
                    updated_at 
                FROM admin_users 
                WHERE id = ?
            ");
            
            $stmt->execute([$id]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            return $user ?: null;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to find user by ID', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, 
                    email, 
                    password_hash, 
                    name,
                    role, 
                    status, 
                    failed_login_attempts, 
                    locked_until, 
                    last_login_at,
                    password_changed_at,
                    created_at, 
                    updated_at 
                FROM admin_users 
                WHERE email = ? AND status != 'suspended'
            ");
            
            $stmt->execute([$email]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if ($user) {
                $this->logger->debug('User found by email', [
                    'email' => $email,
                    'user_id' => $user['id'],
                    'status' => $user['status']
                ]);
            } else {
                $this->logger->warning('User not found by email', ['email' => $email]);
            }
            
            return $user ?: null;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to find user by email', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Update last login time and IP
     */
    public function updateLastLogin(int $userId, string $ipAddress): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                UPDATE admin_users 
                SET last_login_at = NOW(), 
                    failed_login_attempts = 0
                WHERE id = ?
            ");
            
            $result = $stmt->execute([$userId]);
            
            if ($result) {
                $this->logger->info('Updated last login', [
                    'user_id' => $userId,
                    'ip_address' => $ipAddress
                ]);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to update last login', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Increment failed login attempts
     */
    public function incrementFailedAttempts(int $userId): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                UPDATE admin_users 
                SET failed_login_attempts = failed_login_attempts + 1
                WHERE id = ?
            ");
            
            $result = $stmt->execute([$userId]);
            
            // Check if we need to lock the account
            $stmt = $pdo->prepare("
                SELECT failed_login_attempts 
                FROM admin_users 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
            $attempts = $stmt->fetchColumn();
            
            // Lock account after 5 failed attempts for 15 minutes
            if ($attempts >= 5) {
                $this->lockAccount($userId, 900); // 15 minutes
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to increment failed attempts', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Lock user account
     */
    public function lockAccount(int $userId, int $lockDurationSeconds = 900): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                UPDATE admin_users 
                SET locked_until = DATE_ADD(NOW(), INTERVAL ? SECOND)
                WHERE id = ?
            ");
            
            $result = $stmt->execute([$lockDurationSeconds, $userId]);
            
            if ($result) {
                $this->logger->warning('Account locked', [
                    'user_id' => $userId,
                    'duration_seconds' => $lockDurationSeconds
                ]);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to lock account', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Unlock user account
     */
    public function unlockAccount(int $userId): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                UPDATE admin_users 
                SET locked_until = NULL, 
                    failed_login_attempts = 0
                WHERE id = ?
            ");
            
            $result = $stmt->execute([$userId]);
            
            if ($result) {
                $this->logger->info('Account unlocked', ['user_id' => $userId]);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to unlock account', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Check if account is locked
     */
    public function isAccountLocked(int $userId): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT locked_until 
                FROM admin_users 
                WHERE id = ? AND locked_until > NOW()
            ");
            
            $stmt->execute([$userId]);
            $lockedUntil = $stmt->fetchColumn();
            
            return !empty($lockedUntil);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to check account lock status', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            // Err on the side of caution
            return true;
        }
    }

    /**
     * Update password
     */
    public function updatePassword(int $userId, string $passwordHash): bool
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                UPDATE admin_users 
                SET password_hash = ?, 
                    password_changed_at = NOW()
                WHERE id = ?
            ");
            
            $result = $stmt->execute([$passwordHash, $userId]);
            
            if ($result) {
                $this->logger->info('Password updated', ['user_id' => $userId]);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to update password', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Get all users with pagination
     */
    public function getUsers(int $limit = 50, int $offset = 0): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id, 
                    email, 
                    name,
                    role, 
                    status, 
                    last_login_at,
                    failed_login_attempts,
                    CASE 
                        WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN locked_until
                        ELSE NULL
                    END as locked_until,
                    created_at
                FROM admin_users 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$limit, $offset]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get users', [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Get user count
     */
    public function getUserCount(): int
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
            return (int) $stmt->fetchColumn();
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get user count', [
                'error' => $e->getMessage()
            ]);
            
            return 0;
        }
    }

    /**
     * Verify password
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Hash password
     */
    public function hashPassword(string $password): string
    {
        $cost = $_ENV['BCRYPT_COST'] ?? 12;
        return password_hash($password, PASSWORD_DEFAULT, ['cost' => $cost]);
    }
}