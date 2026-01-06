<?php

/**
 * Database Setup for User Management System
 * Creates tables for roles, permissions, and role-permission mappings
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

echo "🔧 Setting up User Management System...\n";
echo "📊 Database: {$database}\n\n";

try {
    $dsn = "mysql:host={$host};port={$port}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    $pdo->exec("USE `{$database}`");
    echo "✅ Connected to database\n\n";
    
    // Create roles table
    echo "Creating roles table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS roles (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            level INT NOT NULL DEFAULT 0,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_level (level)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ roles table created\n";
    
    // Create permissions table
    echo "Creating permissions table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS permissions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            display_name VARCHAR(150) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_category (category)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ permissions table created\n";
    
    // Create role_permissions junction table
    echo "Creating role_permissions table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS role_permissions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            role_id BIGINT NOT NULL,
            permission_id BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
            UNIQUE KEY unique_role_permission (role_id, permission_id),
            INDEX idx_role_id (role_id),
            INDEX idx_permission_id (permission_id)
        ) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✅ role_permissions table created\n";
    
    // Insert default roles
    echo "\nInserting default roles...\n";
    $roles = [
        ['name' => 'super_admin', 'display_name' => 'Super Administrator', 'description' => 'Full system access with all permissions', 'level' => 100, 'is_system' => 1],
        ['name' => 'admin', 'display_name' => 'Administrator', 'description' => 'Administrative access with most permissions', 'level' => 90, 'is_system' => 1],
        ['name' => 'manager', 'display_name' => 'Manager', 'description' => 'Management access with limited permissions', 'level' => 75, 'is_system' => 1],
        ['name' => 'staff', 'display_name' => 'Staff', 'description' => 'Operational access with basic permissions', 'level' => 50, 'is_system' => 0],
        ['name' => 'viewer', 'display_name' => 'Viewer', 'description' => 'Read-only access to specific areas', 'level' => 25, 'is_system' => 0],
    ];
    
    foreach ($roles as $role) {
        $stmt = $pdo->prepare("
            INSERT INTO roles (name, display_name, description, level, is_system)
            VALUES (:name, :display_name, :description, :level, :is_system)
            ON DUPLICATE KEY UPDATE 
                display_name = VALUES(display_name),
                description = VALUES(description),
                level = VALUES(level)
        ");
        $stmt->execute($role);
        echo "  ✓ {$role['display_name']}\n";
    }
    
    // Insert default permissions
    echo "\nInserting default permissions...\n";
    $permissions = [
        // User Management
        ['name' => 'users.view', 'display_name' => 'View Users', 'description' => 'View user list and details', 'category' => 'User Management'],
        ['name' => 'users.create', 'display_name' => 'Create Users', 'description' => 'Create new users', 'category' => 'User Management'],
        ['name' => 'users.edit', 'display_name' => 'Edit Users', 'description' => 'Edit existing users', 'category' => 'User Management'],
        ['name' => 'users.delete', 'display_name' => 'Delete Users', 'description' => 'Delete users', 'category' => 'User Management'],
        ['name' => 'users.manage_roles', 'display_name' => 'Manage User Roles', 'description' => 'Assign and change user roles', 'category' => 'User Management'],
        
        // Role Management
        ['name' => 'roles.view', 'display_name' => 'View Roles', 'description' => 'View role list and details', 'category' => 'Role Management'],
        ['name' => 'roles.create', 'display_name' => 'Create Roles', 'description' => 'Create new roles', 'category' => 'Role Management'],
        ['name' => 'roles.edit', 'display_name' => 'Edit Roles', 'description' => 'Edit existing roles', 'category' => 'Role Management'],
        ['name' => 'roles.delete', 'display_name' => 'Delete Roles', 'description' => 'Delete roles', 'category' => 'Role Management'],
        ['name' => 'roles.manage_permissions', 'display_name' => 'Manage Role Permissions', 'description' => 'Assign permissions to roles', 'category' => 'Role Management'],
        
        // Booking Management
        ['name' => 'bookings.view', 'display_name' => 'View Bookings', 'description' => 'View booking list and details', 'category' => 'Booking Management'],
        ['name' => 'bookings.create', 'display_name' => 'Create Bookings', 'description' => 'Create new bookings', 'category' => 'Booking Management'],
        ['name' => 'bookings.edit', 'display_name' => 'Edit Bookings', 'description' => 'Edit existing bookings', 'category' => 'Booking Management'],
        ['name' => 'bookings.delete', 'display_name' => 'Delete Bookings', 'description' => 'Delete bookings', 'category' => 'Booking Management'],
        ['name' => 'bookings.approve', 'display_name' => 'Approve Bookings', 'description' => 'Approve or reject bookings', 'category' => 'Booking Management'],
        
        // Refund Management
        ['name' => 'refunds.view', 'display_name' => 'View Refunds', 'description' => 'View refund requests', 'category' => 'Refund Management'],
        ['name' => 'refunds.process', 'display_name' => 'Process Refunds', 'description' => 'Process refund requests', 'category' => 'Refund Management'],
        ['name' => 'refunds.approve', 'display_name' => 'Approve Refunds', 'description' => 'Approve or reject refunds', 'category' => 'Refund Management'],
        
        // Content Management
        ['name' => 'content.view', 'display_name' => 'View Content', 'description' => 'View content items', 'category' => 'Content Management'],
        ['name' => 'content.create', 'display_name' => 'Create Content', 'description' => 'Create new content', 'category' => 'Content Management'],
        ['name' => 'content.edit', 'display_name' => 'Edit Content', 'description' => 'Edit existing content', 'category' => 'Content Management'],
        ['name' => 'content.delete', 'display_name' => 'Delete Content', 'description' => 'Delete content', 'category' => 'Content Management'],
        ['name' => 'content.publish', 'display_name' => 'Publish Content', 'description' => 'Publish or unpublish content', 'category' => 'Content Management'],
        
        // Reports & Analytics
        ['name' => 'reports.view', 'display_name' => 'View Reports', 'description' => 'View reports and analytics', 'category' => 'Reports & Analytics'],
        ['name' => 'reports.export', 'display_name' => 'Export Reports', 'description' => 'Export reports to various formats', 'category' => 'Reports & Analytics'],
        ['name' => 'analytics.view', 'display_name' => 'View Analytics', 'description' => 'View analytics dashboards', 'category' => 'Reports & Analytics'],
        
        // System Administration
        ['name' => 'system.settings', 'display_name' => 'System Settings', 'description' => 'Manage system settings', 'category' => 'System Administration'],
        ['name' => 'system.logs', 'display_name' => 'View System Logs', 'description' => 'View system and activity logs', 'category' => 'System Administration'],
        ['name' => 'system.backup', 'display_name' => 'System Backup', 'description' => 'Manage system backups', 'category' => 'System Administration'],
    ];
    
    foreach ($permissions as $permission) {
        $stmt = $pdo->prepare("
            INSERT INTO permissions (name, display_name, description, category, is_system)
            VALUES (:name, :display_name, :description, :category, 1)
            ON DUPLICATE KEY UPDATE 
                display_name = VALUES(display_name),
                description = VALUES(description),
                category = VALUES(category)
        ");
        $stmt->execute($permission);
    }
    echo "  ✓ Inserted " . count($permissions) . " permissions\n";
    
    // Assign permissions to roles
    echo "\nAssigning permissions to roles...\n";
    
    // Super Admin gets all permissions
    $pdo->exec("
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'super_admin'
    ");
    echo "  ✓ Super Admin: All permissions\n";
    
    // Admin gets most permissions (except system-critical ones)
    $pdo->exec("
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'admin'
        AND p.name NOT IN ('system.backup', 'roles.delete')
    ");
    echo "  ✓ Admin: Most permissions\n";
    
    // Manager gets management permissions
    $pdo->exec("
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'manager'
        AND p.category IN ('Booking Management', 'Refund Management', 'Content Management', 'Reports & Analytics')
        AND p.name NOT LIKE '%.delete'
    ");
    echo "  ✓ Manager: Management permissions\n";
    
    // Staff gets operational permissions
    $pdo->exec("
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'staff'
        AND p.name IN ('bookings.view', 'bookings.create', 'bookings.edit', 'content.view', 'reports.view')
    ");
    echo "  ✓ Staff: Operational permissions\n";
    
    // Viewer gets read-only permissions
    $pdo->exec("
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'viewer'
        AND p.name LIKE '%.view'
    ");
    echo "  ✓ Viewer: Read-only permissions\n";
    
    // Show summary
    echo "\n📊 Summary:\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM roles");
    echo "  Roles: " . $stmt->fetch()['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM permissions");
    echo "  Permissions: " . $stmt->fetch()['count'] . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM role_permissions");
    echo "  Role-Permission Assignments: " . $stmt->fetch()['count'] . "\n";
    
    echo "\n🎉 User Management System setup completed!\n";
    
} catch (Exception $e) {
    echo "\n❌ Setup failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
