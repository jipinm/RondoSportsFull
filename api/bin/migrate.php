#!/usr/bin/env php
<?php

/**
 * Database Migration Script
 * 
 * Simple script to set up the authentication database schema
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with($line, '#')) {
            [$key, $value] = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';
$database = $_ENV['DB_NAME'] ?? 'rondo_admin';
$charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

echo "🔧 Starting Database Migration...\n";
echo "📊 Database: {$database}\n";
echo "🏠 Host: {$host}:{$port}\n";
echo "👤 User: {$username}\n\n";

try {
    // Connect to MySQL (without database first)
    $dsn = "mysql:host={$host};port={$port};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "✅ Connected to MySQL server\n";
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET {$charset} COLLATE {$charset}_unicode_ci");
    echo "✅ Database '{$database}' created/verified\n";
    
    // Switch to the database
    $pdo->exec("USE `{$database}`");
    echo "✅ Using database '{$database}'\n\n";
    
    // Read and execute the schema file
    $schemaFile = __DIR__ . '/../schema.sql';
    
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: {$schemaFile}");
    }
    
    $sql = file_get_contents($schemaFile);
    
    // Remove the USE statement to avoid conflicts
    $sql = preg_replace('/^USE\s+[^;]+;/m', '', $sql);
    
    // Remove comments and delimiter statements that could cause issues
    $sql = preg_replace('/^--.*$/m', '', $sql);  // Remove line comments
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);  // Remove block comments
    $sql = preg_replace('/DELIMITER.*$/m', '', $sql);  // Remove delimiter statements
    
    // Split into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && 
                   !preg_match('/^\s*--/', $stmt) && 
                   !preg_match('/^\s*\/\*/', $stmt) &&
                   strlen($stmt) > 5; // Ignore very short statements
        }
    );
    
    echo "📋 Executing " . count($statements) . " SQL statements...\n\n";
    
    foreach ($statements as $index => $statement) {
        if (empty(trim($statement))) continue;
        
        try {
            $pdo->exec($statement);
            
            // Show progress for major operations
            if (stripos($statement, 'CREATE TABLE') !== false) {
                preg_match('/CREATE TABLE.*?`?(\w+)`?/i', $statement, $matches);
                $tableName = $matches[1] ?? 'unknown';
                echo "  ✅ Created table: {$tableName}\n";
            } elseif (stripos($statement, 'CREATE VIEW') !== false) {
                preg_match('/CREATE VIEW.*?`?(\w+)`?/i', $statement, $matches);
                $viewName = $matches[1] ?? 'unknown';
                echo "  ✅ Created view: {$viewName}\n";
            } elseif (stripos($statement, 'CREATE TRIGGER') !== false) {
                preg_match('/CREATE TRIGGER.*?`?(\w+)`?/i', $statement, $matches);
                $triggerName = $matches[1] ?? 'unknown';
                echo "  ✅ Created trigger: {$triggerName}\n";
            } elseif (stripos($statement, 'CREATE PROCEDURE') !== false) {
                preg_match('/CREATE PROCEDURE.*?`?(\w+)`?/i', $statement, $matches);
                $procName = $matches[1] ?? 'unknown';
                echo "  ✅ Created procedure: {$procName}\n";
            } elseif (stripos($statement, 'INSERT INTO') !== false) {
                echo "  ✅ Inserted default data\n";
            }
            
        } catch (PDOException $e) {
            // Skip if already exists
            if (strpos($e->getMessage(), 'already exists') !== false) {
                echo "  ⚠️  Statement " . ($index + 1) . " skipped (already exists)\n";
                continue;
            }
            throw $e;
        }
    }
    
    echo "\n🎉 Migration completed successfully!\n\n";
    
    // Verify the setup
    echo "🔍 Verifying setup...\n";
    
    // Check tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $expectedTables = ['admin_users', 'activity_logs', 'refresh_tokens', 'admin_sessions'];
    $foundTables = array_intersect($expectedTables, $tables);
    
    echo "📊 Tables found: " . implode(', ', $foundTables) . "\n";
    
    if (count($foundTables) === count($expectedTables)) {
        echo "✅ All required tables created\n";
    } else {
        echo "❌ Missing tables: " . implode(', ', array_diff($expectedTables, $foundTables)) . "\n";
    }
    
    // Check for default admin user
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM admin_users WHERE role = 'admin'");
    $adminCount = $stmt->fetch()['count'];
    
    if ($adminCount > 0) {
        echo "✅ Default admin user(s) found: {$adminCount}\n";
        
        // Show admin users (without passwords)
        $stmt = $pdo->query("SELECT id, email, first_name, last_name, role, status, must_change_password FROM admin_users WHERE role = 'admin'");
        $admins = $stmt->fetchAll();
        
        echo "\n👥 Admin Users:\n";
        foreach ($admins as $admin) {
            $changePassword = $admin['must_change_password'] ? ' (⚠️  Must change password)' : '';
            echo "  - ID: {$admin['id']}, Email: {$admin['email']}, Name: {$admin['first_name']} {$admin['last_name']}, Status: {$admin['status']}{$changePassword}\n";
        }
    } else {
        echo "❌ No admin users found\n";
    }
    
    echo "\n🔐 Security Reminders:\n";
    echo "  1. Change the default admin password immediately!\n";
    echo "  2. Set a secure JWT_SECRET in your .env file\n";
    echo "  3. Update database credentials for production\n";
    echo "  4. Enable SSL for database connections in production\n";
    echo "\n✨ Your authentication system is ready to use!\n";
    
} catch (Exception $e) {
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    echo "📍 Line: " . $e->getLine() . "\n";
    echo "📄 File: " . $e->getFile() . "\n";
    exit(1);
}