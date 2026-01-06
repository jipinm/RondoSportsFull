<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\DatabaseService;

/**
 * Activity Logger Service
 * 
 * Logs user activities and authentication events to the database
 */
class ActivityLoggerService
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Log user activity
     */
    public function logActivity(
        int $userId,
        string $action,
        string $description,
        array $metadata = [],
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): bool {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                INSERT INTO activity_logs (
                    user_id, 
                    action, 
                    description, 
                    metadata, 
                    ip_address, 
                    user_agent, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $result = $stmt->execute([
                $userId,
                $action,
                $description,
                json_encode($metadata),
                $ipAddress,
                $userAgent
            ]);
            
            if ($result) {
                $this->logger->debug('Activity logged successfully', [
                    'user_id' => $userId,
                    'action' => $action,
                    'description' => $description
                ]);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to log activity', [
                'user_id' => $userId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Log authentication events
     */
    public function logAuth(
        int $userId,
        string $action,
        bool $success,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        array $metadata = []
    ): bool {
        $description = $success 
            ? "Authentication {$action} successful" 
            : "Authentication {$action} failed";
            
        $metadata['success'] = $success;
        $metadata['timestamp'] = time();
        
        return $this->logActivity(
            $userId,
            "auth.{$action}",
            $description,
            $metadata,
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Log login attempt
     */
    public function logLogin(
        int $userId,
        bool $success,
        ?string $email = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $failureReason = null
    ): bool {
        $metadata = [];
        
        if ($email) {
            $metadata['email'] = $email;
        }
        
        if ($failureReason) {
            $metadata['failure_reason'] = $failureReason;
        }
        
        return $this->logAuth(
            $userId,
            'login',
            $success,
            $ipAddress,
            $userAgent,
            $metadata
        );
    }

    /**
     * Log logout
     */
    public function logLogout(
        int $userId,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): bool {
        return $this->logAuth(
            $userId,
            'logout',
            true,
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Log token refresh
     */
    public function logTokenRefresh(
        int $userId,
        bool $success,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $failureReason = null
    ): bool {
        $metadata = [];
        
        if ($failureReason) {
            $metadata['failure_reason'] = $failureReason;
        }
        
        return $this->logAuth(
            $userId,
            'token_refresh',
            $success,
            $ipAddress,
            $userAgent,
            $metadata
        );
    }

    /**
     * Log password change
     */
    public function logPasswordChange(
        int $userId,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): bool {
        return $this->logActivity(
            $userId,
            'password.change',
            'Password changed successfully',
            [],
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Log account lockout
     */
    public function logAccountLockout(
        int $userId,
        string $reason,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): bool {
        return $this->logActivity(
            $userId,
            'account.lockout',
            'Account locked due to: ' . $reason,
            ['reason' => $reason],
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Log account unlock
     */
    public function logAccountUnlock(
        int $userId,
        int $unlockedByUserId,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): bool {
        return $this->logActivity(
            $userId,
            'account.unlock',
            'Account unlocked by administrator',
            ['unlocked_by' => $unlockedByUserId],
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Get recent activities for a user
     */
    public function getUserActivities(int $userId, int $limit = 50, int $offset = 0): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    id,
                    action,
                    description,
                    metadata,
                    ip_address,
                    user_agent,
                    created_at
                FROM activity_logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$userId, $limit, $offset]);
            $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // Decode metadata JSON
            foreach ($activities as &$activity) {
                $activity['metadata'] = json_decode($activity['metadata'], true) ?? [];
            }
            
            return $activities;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get user activities', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Get all recent activities (admin only)
     */
    public function getAllActivities(int $limit = 100, int $offset = 0): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    al.id,
                    al.user_id,
                    au.email,
                    au.first_name,
                    au.last_name,
                    al.action,
                    al.description,
                    al.metadata,
                    al.ip_address,
                    al.user_agent,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN admin_users au ON al.user_id = au.id
                ORDER BY al.created_at DESC 
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$limit, $offset]);
            $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // Decode metadata JSON
            foreach ($activities as &$activity) {
                $activity['metadata'] = json_decode($activity['metadata'], true) ?? [];
            }
            
            return $activities;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get all activities', [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Get authentication statistics
     */
    public function getAuthStats(int $days = 30): array
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN JSON_EXTRACT(metadata, '$.success') = true THEN 1 ELSE 0 END) as successful_logins,
                    SUM(CASE WHEN JSON_EXTRACT(metadata, '$.success') = false THEN 1 ELSE 0 END) as failed_logins
                FROM activity_logs 
                WHERE action = 'auth.login' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            ");
            
            $stmt->execute([$days]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get auth stats', [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Clean old activity logs
     */
    public function cleanOldLogs(int $daysToKeep = 90): int
    {
        try {
            $pdo = $this->database->getConnection();
            
            $stmt = $pdo->prepare("
                DELETE FROM activity_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            ");
            
            $stmt->execute([$daysToKeep]);
            $deletedCount = $stmt->rowCount();
            
            $this->logger->info('Cleaned old activity logs', [
                'deleted_count' => $deletedCount,
                'days_kept' => $daysToKeep
            ]);
            
            return $deletedCount;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to clean old logs', [
                'error' => $e->getMessage()
            ]);
            
            return 0;
        }
    }
}