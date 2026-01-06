<?php

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

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$database}", $username, $password);
    
    echo "Checking admin user...\n\n";
    
    $stmt = $pdo->query("SELECT id, name, email, role, status FROM admin_users WHERE email = 'admin@example.com'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "Current admin user:\n";
        echo "  ID: {$user['id']}\n";
        echo "  Name: {$user['name']}\n";
        echo "  Email: {$user['email']}\n";
        echo "  Role: {$user['role']}\n";
        echo "  Status: {$user['status']}\n\n";
        
        // Update role if needed
        if ($user['role'] !== 'super_admin') {
            echo "Updating role to super_admin...\n";
            $stmt = $pdo->prepare("UPDATE admin_users SET role = 'super_admin' WHERE id = :id");
            $stmt->execute(['id' => $user['id']]);
            echo "✓ Role updated successfully!\n";
        } else {
            echo "✓ User already has super_admin role\n";
        }
    } else {
        echo "User not found\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
