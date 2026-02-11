<?php

/**
 * Currency Table Setup Script
 * Creates the currencies table for managing currency options
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
$database = $_ENV['DB_NAME'] ?? 'rondo';
$charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

echo "🔧 Setting up Currencies Table...\n";
echo "📊 Database: {$database}\n";

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "✅ Connected to database\n\n";
    
    // Create currencies table
    echo "Creating currencies table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `currencies` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `code` VARCHAR(3) NOT NULL UNIQUE COMMENT 'ISO 4217 currency code (e.g., USD, EUR)',
            `name` VARCHAR(100) NOT NULL COMMENT 'Full currency name',
            `symbol` VARCHAR(10) NOT NULL COMMENT 'Currency symbol (e.g., $, €, £)',
            `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether currency is available for selection',
            `is_default` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this is the default currency',
            `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Display order',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `created_by` INT UNSIGNED NULL COMMENT 'Admin who created this currency',
            `updated_by` INT UNSIGNED NULL COMMENT 'Admin who last updated this currency',
            INDEX `idx_is_active` (`is_active`),
            INDEX `idx_is_default` (`is_default`),
            INDEX `idx_sort_order` (`sort_order`),
            INDEX `idx_code` (`code`)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Currency management for the platform'
    ");
    echo "✅ currencies table created\n";
    
    // Insert default currencies
    echo "Inserting default currencies...\n";
    
    $defaultCurrencies = [
        ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'is_active' => 1, 'is_default' => 1, 'sort_order' => 1],
        ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'is_active' => 1, 'is_default' => 0, 'sort_order' => 2],
        ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => '£', 'is_active' => 1, 'is_default' => 0, 'sort_order' => 3],
        ['code' => 'AED', 'name' => 'UAE Dirham', 'symbol' => 'د.إ', 'is_active' => 1, 'is_default' => 0, 'sort_order' => 4],
        ['code' => 'INR', 'name' => 'Indian Rupee', 'symbol' => '₹', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 5],
        ['code' => 'SAR', 'name' => 'Saudi Riyal', 'symbol' => '﷼', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 6],
        ['code' => 'CHF', 'name' => 'Swiss Franc', 'symbol' => 'CHF', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 7],
        ['code' => 'AUD', 'name' => 'Australian Dollar', 'symbol' => 'A$', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 8],
        ['code' => 'CAD', 'name' => 'Canadian Dollar', 'symbol' => 'C$', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 9],
        ['code' => 'JPY', 'name' => 'Japanese Yen', 'symbol' => '¥', 'is_active' => 0, 'is_default' => 0, 'sort_order' => 10],
    ];
    
    $stmt = $pdo->prepare("
        INSERT INTO currencies (code, name, symbol, is_active, is_default, sort_order)
        VALUES (:code, :name, :symbol, :is_active, :is_default, :sort_order)
        ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            symbol = VALUES(symbol),
            sort_order = VALUES(sort_order)
    ");
    
    foreach ($defaultCurrencies as $currency) {
        $stmt->execute($currency);
        echo "  - {$currency['code']} ({$currency['name']})\n";
    }
    
    echo "\n✅ Default currencies inserted\n";
    echo "\n🎉 Currencies table setup completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
