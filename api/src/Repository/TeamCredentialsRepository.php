<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use PDO;
use Exception;
use PDOException;

class TeamCredentialsRepository
{
    private DatabaseService $db;

    public function __construct(DatabaseService $db)
    {
        $this->db = $db;
    }

    /**
     * Get team credentials with pagination and filters
     */
    public function getTeamCredentials(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $whereClause = '';
            $params = [];

            // Build WHERE conditions
            $conditions = [];
            $conditions[] = 'tc.sport_type = ?'; // Always filter by soccer
            $params[] = 'soccer';

            // Search filter
            if (!empty($filters['search'])) {
                $searchTerm = '%' . $filters['search'] . '%';
                $conditions[] = '(
                    tc.team_name LIKE ? OR 
                    tc.tournament_name LIKE ? OR 
                    tc.short_description LIKE ? OR
                    tc.team_id LIKE ? OR
                    tc.tournament_id LIKE ?
                )';
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            }

            // Status filter
            if (!empty($filters['status'])) {
                $conditions[] = 'tc.status = ?';
                $params[] = $filters['status'];
            }

            // Tournament filter
            if (!empty($filters['tournament_id'])) {
                $conditions[] = 'tc.tournament_id = ?';
                $params[] = $filters['tournament_id'];
            }

            // Team filter
            if (!empty($filters['team_id'])) {
                $conditions[] = 'tc.team_id = ?';
                $params[] = $filters['team_id'];
            }

            // Date range filters
            if (!empty($filters['start_date'])) {
                $conditions[] = 'DATE(tc.created_at) >= ?';
                $params[] = $filters['start_date'];
            }

            if (!empty($filters['end_date'])) {
                $conditions[] = 'DATE(tc.created_at) <= ?';
                $params[] = $filters['end_date'];
            }

            if (!empty($conditions)) {
                $whereClause = 'WHERE ' . implode(' AND ', $conditions);
            }

            // Calculate offset
            $offset = ($page - 1) * $limit;

            // Main query with joins for admin user names
            $sql = "
                SELECT 
                    tc.*,
                    creator.name as created_by_name,
                    updater.name as updated_by_name
                FROM team_credentials tc
                LEFT JOIN admin_users creator ON tc.created_by = creator.id
                LEFT JOIN admin_users updater ON tc.updated_by = updater.id
                $whereClause
                ORDER BY tc.updated_at DESC, tc.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $params[] = $limit;
            $params[] = $offset;

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $credentials = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countSql = "
                SELECT COUNT(*) as total
                FROM team_credentials tc
                $whereClause
            ";

            $countParams = array_slice($params, 0, -2); // Remove limit and offset
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($countParams);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            return [
                'credentials' => $credentials,
                'total' => (int) $totalCount,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($totalCount / $limit)
            ];

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve team credentials: ' . $e->getMessage());
        }
    }

    /**
     * Get a single team credential by ID
     */
    public function getTeamCredentialById(int $id): ?array
    {
        try {
            $sql = "
                SELECT 
                    tc.*,
                    creator.name as created_by_name,
                    updater.name as updated_by_name
                FROM team_credentials tc
                LEFT JOIN admin_users creator ON tc.created_by = creator.id
                LEFT JOIN admin_users updater ON tc.updated_by = updater.id
                WHERE tc.id = ? AND tc.sport_type = 'soccer'
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            
            $credential = $stmt->fetch(PDO::FETCH_ASSOC);
            return $credential ?: null;

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve team credential: ' . $e->getMessage());
        }
    }

    /**
     * Get team credential by tournament and team ID
     */
    public function getTeamCredentialByTeam(string $tournamentId, string $teamId): ?array
    {
        try {
            $sql = "
                SELECT 
                    tc.*,
                    creator.name as created_by_name,
                    updater.name as updated_by_name
                FROM team_credentials tc
                LEFT JOIN admin_users creator ON tc.created_by = creator.id
                LEFT JOIN admin_users updater ON tc.updated_by = updater.id
                WHERE tc.tournament_id = ? AND tc.team_id = ? AND tc.sport_type = 'soccer'
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$tournamentId, $teamId]);
            
            $credential = $stmt->fetch(PDO::FETCH_ASSOC);
            return $credential ?: null;

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve team credential by team: ' . $e->getMessage());
        }
    }

    /**
     * Create new team credential
     */
    public function createTeamCredential(array $data): int
    {
        try {
            $sql = "
                INSERT INTO team_credentials (
                    sport_type, tournament_id, team_id, team_name, tournament_name,
                    short_description, logo_filename, banner_filename, logo_url, banner_url,
                    status, created_by, updated_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            ";

            $params = [
                'soccer', // Always soccer for this feature
                $data['tournament_id'],
                $data['team_id'],
                $data['team_name'] ?? null,
                $data['tournament_name'] ?? null,
                $data['short_description'] ?? null,
                $data['logo_filename'] ?? null,
                $data['banner_filename'] ?? null,
                $data['logo_url'] ?? null,
                $data['banner_url'] ?? null,
                $data['status'] ?? 'active',
                $data['created_by'] ?? null,
                $data['created_by'] ?? null // updated_by same as created_by initially
            ];

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            return (int) $pdo->lastInsertId();

        } catch (PDOException $e) {
            if ($e->getCode() === '23000') { // Duplicate entry
                throw new Exception('Team credential already exists for this tournament and team combination.');
            }
            throw new Exception('Failed to create team credential: ' . $e->getMessage());
        }
    }

    /**
     * Update team credential
     */
    public function updateTeamCredential(int $id, array $data, int $updatedBy): bool
    {
        try {
            error_log("=== REPOSITORY updateTeamCredential DEBUG ===");
            error_log("ID: $id");
            error_log("Updated by: $updatedBy");
            error_log("Data: " . json_encode($data));
            
            // Build dynamic update query
            $setClause = [];
            $params = [];

            $allowedFields = [
                'team_name', 'tournament_name', 'short_description',
                'logo_filename', 'banner_filename', 'logo_url', 'banner_url', 'status', 'is_featured'
            ];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $setClause[] = "$field = ?";
                    $params[] = $data[$field];
                    $value = $data[$field] === null ? 'NULL' : $data[$field];
                    error_log("Adding field $field with value: " . $value);
                }
            }

            if (empty($setClause)) {
                error_log("No fields to update - returning false");
                return false; // Nothing to update
            }

            // Always update the updated_by and updated_at
            $setClause[] = 'updated_by = ?';
            $params[] = $updatedBy;

            $sql = "
                UPDATE team_credentials 
                SET " . implode(', ', $setClause) . "
                WHERE id = ? AND sport_type = 'soccer'
            ";

            $params[] = $id;

            error_log("Final SQL: " . $sql);
            error_log("Final params: " . json_encode($params));

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            
            error_log("Executing SQL...");
            $result = $stmt->execute($params);
            $rowCount = $stmt->rowCount();
            
            error_log("SQL execution result: " . ($result ? 'true' : 'false'));
            error_log("Rows affected: " . $rowCount);
            
            if ($result && $rowCount > 0) {
                error_log("Update successful");
                return true;
            } else {
                error_log("Update failed - no rows affected or execution failed");
                // Check if the record exists
                $checkSql = "SELECT id FROM team_credentials WHERE id = ? AND sport_type = 'soccer'";
                $checkStmt = $pdo->prepare($checkSql);
                $checkStmt->execute([$id]);
                $exists = $checkStmt->fetch();
                error_log("Record exists check: " . ($exists ? 'YES' : 'NO'));
                if ($exists) {
                    error_log("Record exists but no rows were updated");
                } else {
                    error_log("Record does not exist with ID $id");
                }
                return false;
            }

        } catch (PDOException $e) {
            error_log("PDO Exception in updateTeamCredential: " . $e->getMessage());
            error_log("PDO Error Code: " . $e->getCode());
            error_log("PDO Error Info: " . json_encode($e->errorInfo));
            throw new Exception('Failed to update team credential: ' . $e->getMessage());
        } catch (Exception $e) {
            error_log("General Exception in updateTeamCredential: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete team credential (soft delete by setting status to inactive)
     */
    public function deleteTeamCredential(int $id, int $updatedBy): bool
    {
        try {
            $sql = "
                DELETE FROM team_credentials 
                WHERE id = ? AND sport_type = 'soccer'
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([$id]);

            return $result && $stmt->rowCount() > 0;

        } catch (PDOException $e) {
            throw new Exception('Failed to delete team credential: ' . $e->getMessage());
        }
    }

    /**
     * Get all teams for a specific tournament
     */
    public function getTournamentTeams(string $tournamentId): array
    {
        try {
            $sql = "
                SELECT 
                    tc.*,
                    creator.name as created_by_name,
                    updater.name as updated_by_name
                FROM team_credentials tc
                LEFT JOIN admin_users creator ON tc.created_by = creator.id
                LEFT JOIN admin_users updater ON tc.updated_by = updater.id
                WHERE tc.tournament_id = ? AND tc.sport_type = 'soccer'
                ORDER BY tc.team_name ASC
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$tournamentId]);

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve tournament teams: ' . $e->getMessage());
        }
    }

    /**
     * Get team credentials statistics
     */
    public function getTeamCredentialsStats(): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_credentials,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_credentials,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_credentials,
                    COUNT(CASE WHEN logo_filename IS NOT NULL THEN 1 END) as with_logo,
                    COUNT(CASE WHEN banner_filename IS NOT NULL THEN 1 END) as with_banner,
                    COUNT(DISTINCT tournament_id) as unique_tournaments,
                    COUNT(DISTINCT team_id) as unique_teams
                FROM team_credentials 
                WHERE sport_type = 'soccer'
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->query($sql);

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve team credentials statistics: ' . $e->getMessage());
        }
    }

    /**
     * Check if team credential exists
     */
    public function teamCredentialExists(string $tournamentId, string $teamId, ?int $excludeId = null): bool
    {
        try {
            $sql = "
                SELECT COUNT(*) as count
                FROM team_credentials 
                WHERE tournament_id = ? AND team_id = ? AND sport_type = 'soccer'
            ";

            $params = [$tournamentId, $teamId];

            if ($excludeId !== null) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] > 0;

        } catch (PDOException $e) {
            throw new Exception('Failed to check team credential existence: ' . $e->getMessage());
        }
    }

    /**
     * Get featured team credentials for public display
     */
    public function getFeaturedTeamCredentials(): array
    {
        try {
            $sql = "
                SELECT 
                    sport_type,
                    tournament_id,
                    team_id,
                    team_name,
                    logo_url
                FROM team_credentials
                WHERE is_featured = 1 AND status = 'active'
                ORDER BY team_name ASC
            ";

            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new Exception('Failed to retrieve featured team credentials: ' . $e->getMessage());
        }
    }
}