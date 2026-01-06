/**
 * Frontend Permission Service
 *
 * Handles role-based access control for the admin frontend
 */

export interface UserPermissions {
  role: string;
  level: number;
  permissions: string[];
  categories: PermissionCategory[];
}

export interface PermissionCategory {
  title: string;
  permissions: { [key: string]: string };
}

export interface RoleInfo {
  name: string;
  level: number;
  permissions: string[];
  manageableBy: string[];
}

class FrontendPermissionService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_URL;

  /**
   * Get current user permissions
   */
  async getCurrentUserPermissions(): Promise<UserPermissions | null> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${this.API_BASE_URL}/roles/me/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        return false;
      }

      const response = await fetch(`${this.API_BASE_URL}/roles/check-permission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission }),
      });

      const data = await response.json();

      return response.ok && data.success && data.data.has_permission;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Get all available roles
   */
  async getRoles(): Promise<RoleInfo[]> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        return [];
      }

      const response = await fetch(`${this.API_BASE_URL}/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data.roles;
      }

      return [];
    } catch (error) {
      console.error('Failed to get roles:', error);
      return [];
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: number, newRole: string): Promise<boolean> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        return false;
      }

      const response = await fetch(`${this.API_BASE_URL}/roles/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      return response.ok && data.success;
    } catch (error) {
      console.error('Failed to update user role:', error);
      return false;
    }
  }

  /**
   * Get users by role (admin only)
   */
  async getUsersByRole(role: string): Promise<any[]> {
    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        return [];
      }

      const response = await fetch(`${this.API_BASE_URL}/roles/users/${role}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data.users;
      }

      return [];
    } catch (error) {
      console.error('Failed to get users by role:', error);
      return [];
    }
  }

  /**
   * Client-side permission check (for UI rendering)
   * This is a fallback when API is not available
   */
  hasPermissionClientSide(userRole: string, permission: string): boolean {
    // Super admin always has all permissions
    if (userRole === 'super_admin') {
      return true;
    }

    const rolePermissions: { [key: string]: string[] } = {
      'super_admin': [
        // Super Admin has all permissions
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        'customers.view', 'customers.manage', 'customers.disable', 'customers.export',
        'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.approve',
        'refunds.view', 'refunds.process', 'refunds.approve',
        'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish',
        'reports.view', 'reports.export', 'analytics.view',
        'system.settings', 'system.logs', 'system.backup',
        'roles.manage', 'permissions.manage', 'admin.full_access',
      ],
      'admin': [
        // User Management
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        // Customer Management
        'customers.view', 'customers.manage', 'customers.disable', 'customers.export',
        // Booking Management
        'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.approve',
        // Refund Management
        'refunds.view', 'refunds.process', 'refunds.approve',
        // Content Management
        'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish',
        // Reports & Analytics
        'reports.view', 'reports.export', 'analytics.view',
        // System Administration
        'system.settings', 'system.logs', 'system.backup',
      ],
      'manager': [
        // User Management (limited)
        'users.view',
        // Customer Management (limited)
        'customers.view',
        // Booking Management
        'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.approve',
        // Refund Management
        'refunds.view', 'refunds.process',
        // Content Management
        'content.view', 'content.create', 'content.edit',
        // Reports
        'reports.view',
      ],
      'staff': [
        // Basic User Management
        'users.view',
        // Booking Management
        'bookings.view', 'bookings.create', 'bookings.edit',
        // Content Management (read-only)
        'content.view',
      ],
      'viewer': [
        // Read-only access
        'users.view', 'bookings.view', 'content.view', 'reports.view',
      ],
    };

    return (rolePermissions[userRole] || []).includes(permission);
  }

  /**
   * Check if user can manage specific role
   */
  canManageRole(userRole: string, targetRole: string): boolean {
    const roleHierarchy: { [key: string]: number } = {
      'super_admin': 150,
      'admin': 100,
      'manager': 75,
      'staff': 50,
      'viewer': 25,
    };

    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[targetRole] || 0);
  }

  /**
   * Get manageable roles for current user
   */
  getManageableRoles(userRole: string): string[] {
    const roleHierarchy: { [key: string]: number } = {
      'super_admin': 150,
      'admin': 100,
      'manager': 75,
      'staff': 50,
      'viewer': 25,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    return Object.keys(roleHierarchy).filter(role => (roleHierarchy[role] || 0) <= userLevel);
  }

  /**
   * Get permission categories for UI display
   */
  getPermissionCategories(): PermissionCategory[] {
    return [
      {
        title: 'User Management',
        permissions: {
          'users.view': 'View Users',
          'users.create': 'Create Users',
          'users.edit': 'Edit Users',
          'users.delete': 'Delete Users',
          'users.manage_roles': 'Manage User Roles',
        }
      },
      {
        title: 'Booking Management',
        permissions: {
          'bookings.view': 'View Bookings',
          'bookings.create': 'Create Bookings',
          'bookings.edit': 'Edit Bookings',
          'bookings.delete': 'Delete Bookings',
          'bookings.approve': 'Approve Bookings',
        }
      },
      {
        title: 'Refund Management',
        permissions: {
          'refunds.view': 'View Refunds',
          'refunds.process': 'Process Refunds',
          'refunds.approve': 'Approve Refunds',
        }
      },
      {
        title: 'Content Management',
        permissions: {
          'content.view': 'View Content',
          'content.create': 'Create Content',
          'content.edit': 'Edit Content',
          'content.delete': 'Delete Content',
          'content.publish': 'Publish Content',
        }
      },
      {
        title: 'Reports & Analytics',
        permissions: {
          'reports.view': 'View Reports',
          'reports.export': 'Export Reports',
          'analytics.view': 'View Analytics',
        }
      },
      {
        title: 'System Administration',
        permissions: {
          'system.settings': 'System Settings',
          'system.logs': 'View System Logs',
          'system.backup': 'System Backup',
        }
      }
    ];
  }
}

// Export singleton instance
export const permissionService = new FrontendPermissionService();
export default permissionService;
