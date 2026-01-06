<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;

/**
 * Database Service
 * 
 * Provides database connection and basic operations for admin functionality
 */
class DatabaseService
{
    private ?PDO $connection = null;
    private LoggerInterface $logger;
    private array $config;

    public function __construct(LoggerInterface $logger, array $config = [])
    {
        $this->logger = $logger;
        $this->config = array_merge([
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'dbname' => $_ENV['DB_NAME'] ?? 'rondo',
            'username' => $_ENV['DB_USER'] ?? 'root',
            'password' => $_ENV['DB_PASS'] ?? '',
            'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4',
            'port' => $_ENV['DB_PORT'] ?? '3306'
        ], $config);
    }

    /**
     * Get database connection
     * 
     * @return PDO
     * @throws PDOException
     */
    public function getConnection(): PDO
    {
        if ($this->connection === null) {
            $this->connect();
        }

        return $this->connection;
    }

    /**
     * Establish database connection
     * 
     * @throws PDOException
     */
    private function connect(): void
    {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $this->config['host'],
                $this->config['port'],
                $this->config['dbname'],
                $this->config['charset']
            );

            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ]
            );

            $this->logger->info('Database connection established successfully');
        } catch (PDOException $e) {
            $this->logger->error('Database connection failed', [
                'error' => $e->getMessage(),
                'host' => $this->config['host'],
                'dbname' => $this->config['dbname'],
                'username' => $this->config['username']
            ]);
            throw $e;
        }
    }

    /**
     * Check if database connection is available
     * 
     * @return bool
     */
    public function isConnected(): bool
    {
        try {
            if ($this->connection === null) {
                $this->connect();
            }
            
            // Test the connection with a simple query
            $this->connection->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            $this->logger->warning('Database connection check failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Execute a query and return all results
     * 
     * @param string $sql
     * @param array $params
     * @return array
     * @throws PDOException
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Execute a query and return first result
     * 
     * @param string $sql
     * @param array $params
     * @return array|null
     * @throws PDOException
     */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Execute a query and return single column value
     * 
     * @param string $sql
     * @param array $params
     * @return mixed
     * @throws PDOException
     */
    public function fetchColumn(string $sql, array $params = [])
    {
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /**
     * Execute an INSERT/UPDATE/DELETE query
     * 
     * @param string $sql
     * @param array $params
     * @return int Number of affected rows
     * @throws PDOException
     */
    public function execute(string $sql, array $params = []): int
    {
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Insert a record and return the last insert ID
     * 
     * @param string $sql
     * @param array $params
     * @return string Last insert ID
     * @throws PDOException
     */
    public function insert(string $sql, array $params = []): string
    {
        $this->execute($sql, $params);
        return $this->getConnection()->lastInsertId();
    }

    /**
     * Begin a database transaction
     * 
     * @return bool
     */
    public function beginTransaction(): bool
    {
        try {
            return $this->getConnection()->beginTransaction();
        } catch (PDOException $e) {
            $this->logger->error('Failed to begin transaction', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Commit a database transaction
     * 
     * @return bool
     */
    public function commit(): bool
    {
        try {
            return $this->getConnection()->commit();
        } catch (PDOException $e) {
            $this->logger->error('Failed to commit transaction', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Rollback a database transaction
     * 
     * @return bool
     */
    public function rollback(): bool
    {
        try {
            return $this->getConnection()->rollback();
        } catch (PDOException $e) {
            $this->logger->error('Failed to rollback transaction', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Get database information
     * 
     * @return array
     */
    public function getDatabaseInfo(): array
    {
        try {
            $pdo = $this->getConnection();
            
            return [
                'version' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
                'charset' => $this->fetchColumn("SELECT @@character_set_database"),
                'collation' => $this->fetchColumn("SELECT @@collation_database"),
                'connection_id' => $this->fetchColumn("SELECT CONNECTION_ID()"),
                'database_name' => $this->config['dbname']
            ];
        } catch (PDOException $e) {
            $this->logger->error('Failed to get database info', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Check if a table exists
     * 
     * @param string $tableName
     * @return bool
     */
    public function tableExists(string $tableName): bool
    {
        try {
            $result = $this->fetchOne("SHOW TABLES LIKE ?", [$tableName]);
            return $result !== null;
        } catch (PDOException $e) {
            $this->logger->error('Failed to check table existence', [
                'table' => $tableName,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get list of all tables in the database
     * 
     * @return array
     */
    public function getTables(): array
    {
        try {
            $results = $this->fetchAll("SHOW TABLES");
            $tables = [];
            foreach ($results as $row) {
                $tables[] = array_values($row)[0];
            }
            return $tables;
        } catch (PDOException $e) {
            $this->logger->error('Failed to get table list', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Close database connection
     */
    public function close(): void
    {
        $this->connection = null;
        $this->logger->info('Database connection closed');
    }

    /**
     * Destructor - ensure connection is closed
     */
    public function __destruct()
    {
        $this->close();
    }
}