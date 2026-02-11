<?php

/**
 * Migration Script: Drop unused currency columns
 * Removes decimal_places and exchange_rate_to_usd columns from currencies table
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

echo "🔧 Dropping unused currency columns...\n";
echo "📊 Database: {$database}\n";

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "✅ Connected to database\n\n";
    
    // Check if columns exist before dropping
    $stmt = $pdo->query("SHOW COLUMNS FROM currencies LIKE 'decimal_places'");
    $hasDecimalPlaces = $stmt->fetch() !== false;
    
    $stmt = $pdo->query("SHOW COLUMNS FROM currencies LIKE 'exchange_rate_to_usd'");
    $hasExchangeRate = $stmt->fetch() !== false;
    
    if ($hasDecimalPlaces) {
        echo "Dropping decimal_places column...\n";
        $pdo->exec("ALTER TABLE currencies DROP COLUMN decimal_places");
        echo "✅ decimal_places column dropped\n";
    } else {
        echo "⏭️ decimal_places column does not exist, skipping\n";
    }
    
    if ($hasExchangeRate) {
        echo "Dropping exchange_rate_to_usd column...\n";
        $pdo->exec("ALTER TABLE currencies DROP COLUMN exchange_rate_to_usd");
        echo "✅ exchange_rate_to_usd column dropped\n";
    } else {
        echo "⏭️ exchange_rate_to_usd column does not exist, skipping\n";
    }
    
    echo "\n🎉 Migration completed successfully!\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
