import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import permissionService from '../services/permissionService';
import { Users, Shield, AlertCircle } from 'lucide-react';
import styles from './RoleManagement.module.css';

interface RoleInfo {
  name: string;
  level: number;
  permissions: string[];
  manageableBy: string[];
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
}

const RoleManagement: React.FC = () => {
  const { checkPermission } = useAuth();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRolesAndUsers();
  }, []);

  const loadRolesAndUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all roles
      const rolesData = await permissionService.getRoles();
      setRoles(rolesData);

      // Load users for each role
      const usersByRole: { [key: string]: User[] } = {};

      for (const role of rolesData) {
        try {
          const roleUsers = await permissionService.getUsersByRole(role.name);
          usersByRole[role.name] = roleUsers;
        } catch (error) {
          console.error(`Failed to load users for role ${role.name}:`, error);
          usersByRole[role.name] = [];
        }
      }

      setUsers(usersByRole);
    } catch (error) {
      console.error('Failed to load roles and users:', error);
      setError('Failed to load roles and users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const success = await permissionService.updateUserRole(userId, newRole);
      if (success) {
        await loadRolesAndUsers(); // Refresh data
      } else {
        setError('Failed to update user role');
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
      setError('Failed to update user role');
    }
  };

  if (!checkPermission('users.manage_roles')) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Access Denied</h2>
          <p>You don't have permission to manage user roles.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading roles and users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadRolesAndUsers} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Shield size={32} />
          <div>
            <h1>Role Management</h1>
            <p>Manage user roles and permissions</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {roles.map((role) => (
          <div key={role.name} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div className={styles.roleInfo}>
                <h3 className={styles.roleName}>{role.name}</h3>
                <span className={styles.roleLevel}>Level {role.level}</span>
              </div>
              <div className={styles.userCount}>
                <Users size={16} />
                <span>{users[role.name]?.length || 0} users</span>
              </div>
            </div>

            <div className={styles.permissionsSection}>
              <h4>Permissions</h4>
              <div className={styles.permissionsGrid}>
                {role.permissions.map((permission) => (
                  <span key={permission} className={styles.permissionTag}>
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.usersSection}>
              <h4>Users with this role</h4>
              {users[role.name]?.length > 0 ? (
                <div className={styles.usersList}>
                  {users[role.name].map((user) => (
                    <div key={user.id} className={styles.userItem}>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.name}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                      </div>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={styles.roleSelect}
                      >
                        {role.manageableBy.map((manageableRole) => (
                          <option key={manageableRole} value={manageableRole}>
                            {manageableRole}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noUsers}>No users with this role</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleManagement;
