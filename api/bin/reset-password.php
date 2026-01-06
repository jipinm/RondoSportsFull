<?php

/**
 * Reset Admin Password Script
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Load environment
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

echo "🔧 Resetting admin password...\n";

try {
    $dsn = "mysql:host={$host};port={$port}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    $pdo->exec("USE `{$database}`");
    
    // Check current admin users
    $stmt = $pdo->query("SELECT id, email, name, role FROM admin_users WHERE role IN ('super_admin', 'admin') LIMIT 5");
    $admins = $stmt->fetchAll();
    
    echo "📋 Current admin users:\n";
    foreach ($admins as $admin) {
        echo "  - ID: {$admin['id']}, Email: {$admin['email']}, Name: {$admin['name']}, Role: {$admin['role']}\n";
    }
    
    // Reset password for the first admin user
    if (!empty($admins)) {
        $adminId = $admins[0]['id'];
        $adminEmail = $admins[0]['email'];
        $newPassword = 'admin123';
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            UPDATE admin_users 
            SET password_hash = ?, 
                failed_login_attempts = 0,
                locked_until = NULL,
                password_changed_at = NOW()
            WHERE id = ?
        ");
        
        $result = $stmt->execute([$passwordHash, $adminId]);
        
        if ($result) {
            echo "\n✅ Password reset successfully!\n";
            echo "📧 Login credentials:\n";
            echo "  Email: {$adminEmail}\n";
            echo "  Password: {$newPassword}\n";
            echo "\n🔑 Password hash: " . substr($passwordHash, 0, 30) . "...\n";
        } else {
            echo "❌ Failed to reset password\n";
        }
    } else {
        echo "❌ No admin users found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}