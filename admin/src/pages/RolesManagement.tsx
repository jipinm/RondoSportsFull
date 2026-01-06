import React, { useState, useEffect } from 'react';
import type {
  Role,
  Permission,
  RoleFormData,
  RoleFormErrors,
  ModalState,
  LoadingState,
  NotificationState
} from '../types/roles';
import { rolesApi } from '../services/roles-api';
import { authService } from '../services/authService';
import { RoleTable } from '../components/roles/RoleTable';
import { RoleFormModal } from '../components/roles/RoleFormModal';
import { RoleDeleteModal } from '../components/roles/RoleDeleteModal';
import styles from './RolesManagement.module.css';

export const RolesManagement: React.FC = () => {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formErrors, setFormErrors] = useState<RoleFormErrors>({});
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const [loading, setLoading] = useState<LoadingState>({
    roles: true,
    permissions: true,
    creating: false,
    updating: false,
    deleting: false,
    validating: false,
    modal: false
  });

  // Load initial data
  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadCurrentUserPermissions();
  }, []);

  const loadRoles = async () => {
    setLoading(prev => ({ ...prev, roles: true }));
    try {
      const response = await rolesApi.getRoles();
      if (response.success && response.data) {
        setRoles(response.data.data);
      } else {
        showNotification('error', response.message || 'Failed to load roles');
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      showNotification('error', 'Failed to load roles');
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  };

  const loadPermissions = async () => {
    setLoading(prev => ({ ...prev, permissions: true }));
    try {
      const response = await rolesApi.getPermissions();
      if (response.success && response.data) {
        setPermissions(response.data);
      } else {
        showNotification('error', response.message || 'Failed to load permissions');
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      showNotification('error', 'Failed to load permissions');
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }));
    }
  };

  const loadCurrentUserPermissions = async () => {
    try {
      // Get current user data
      const userData = authService.getUserData();
      setCurrentUser(userData);
      
      // Get user permissions from API
      const response = await rolesApi.getCurrentUserPermissions();
      if (response.success && response.data) {
        setCurrentUserPermissions(response.data);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
    }
  };

  const showNotification = (type: NotificationState['type'], message: string, duration = 5000) => {
    setNotification({ type, message, duration });
    setTimeout(() => setNotification(null), duration);
  };

  // Modal handlers
  const handleCreateRole = () => {
    setSelectedRole(null);
    setFormErrors({});
    setModalState('create');
  };

  const handleEditRole = async (role: Role) => {
    setLoading(prev => ({ ...prev, modal: true }));
    try {
      // Fetch complete role data including permissions
      const response = await rolesApi.getRole(role.id);
      if (response.success && response.data) {
        setSelectedRole(response.data);
        setFormErrors({});
        setModalState('edit');
      } else {
        showNotification('error', response.message || 'Failed to load role data');
      }
    } catch (error) {
      console.error('Error loading role for edit:', error);
      showNotification('error', 'Failed to load role data');
    } finally {
      setLoading(prev => ({ ...prev, modal: false }));
    }
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setModalState('delete');
  };

  const handleCloseModal = () => {
    setModalState('closed');
    setSelectedRole(null);
    setFormErrors({});
  };

  // CRUD operations
  const handleSubmitRole = async (formData: RoleFormData) => {
    const isEditing = modalState === 'edit' && selectedRole;
    
    console.log('handleSubmitRole called with:', { formData, isEditing, modalState });
    
    setLoading(prev => ({ 
      ...prev, 
      creating: !isEditing, 
      updating: !!isEditing 
    }));
    setFormErrors({});

    try {
      const roleData = {
        name: formData.name,
        display_name: formData.name, // Use name as display_name for simplicity
        description: formData.description,
        level: 50, // Default level
        permission_ids: formData.selectedPermissions
      };

      console.log('Submitting role data:', roleData);
      console.log('Selected permissions:', formData.selectedPermissions);
      console.log('Selected permissions length:', formData.selectedPermissions.length);
      console.log('Selected permissions type:', typeof formData.selectedPermissions);
      console.log('Is permissions array:', Array.isArray(formData.selectedPermissions));
      console.log('API endpoint will be:', isEditing ? `PUT /roles/${selectedRole.id}` : 'POST /roles');

      // Validate permissions are selected
      if (!Array.isArray(formData.selectedPermissions) || formData.selectedPermissions.length === 0) {
        console.error('No permissions selected!');
        setFormErrors({ selectedPermissions: 'At least one permission must be selected' });
        return;
      }

      let response;
      if (isEditing) {
        response = await rolesApi.updateRole(selectedRole.id, roleData);
      } else {
        response = await rolesApi.createRole(roleData);
      }

      console.log('API response:', response);

      if (response.success) {
        showNotification('success', 
          `Role ${isEditing ? 'updated' : 'created'} successfully`
        );
        handleCloseModal();
        loadRoles(); // Refresh the list
      } else {
        console.log('API returned error:', response);
        if (response.errors) {
          setFormErrors(response.errors);
        } else {
          setFormErrors({ general: response.message || 'An error occurred' });
        }
      }
    } catch (error) {
      console.error('Error submitting role:', error);
      setFormErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        creating: false, 
        updating: false 
      }));
    }
  };

  const handleConfirmDelete = async (roleId: number, force = false) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    
    try {
      const response = await rolesApi.deleteRole(roleId, force);
      
      if (response.success) {
        showNotification('success', 'Role deleted successfully');
        handleCloseModal();
        loadRoles(); // Refresh the list
      } else {
        showNotification('error', response.message || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('error', 'An unexpected error occurred');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  };

  const handleBulkAction = async (action: string, roleIds: number[]) => {
    try {
      const response = await rolesApi.bulkAction({ 
        action: action as any, 
        role_ids: roleIds 
      });
      
      if (response.success && response.data) {
        const { processed, failed } = response.data;
        showNotification('success', 
          `Bulk ${action}: ${processed} processed, ${failed} failed`
        );
        loadRoles(); // Refresh the list
      } else {
        showNotification('error', response.message || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showNotification('error', 'Bulk action failed');
    }
  };

  // Permission checks
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canCreateRole = isSuperAdmin || currentUserPermissions.includes('role.create');
  const canViewRoles = isSuperAdmin || currentUserPermissions.includes('role.read');

  if (!canViewRoles) {
    return (
      <div className={styles.noAccess}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view roles.</p>
      </div>
    );
  }

  return (
    <div className={styles.rolesManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Roles & Permissions Management</h1>
          <p className={styles.subtitle}>
            Manage user roles and their associated permissions
          </p>
        </div>
        <div className={styles.headerRight}>
          {canCreateRole && (
            <button 
              onClick={handleCreateRole}
              className={styles.createButton}
              disabled={loading.roles || loading.permissions}
            >
              + Create Role
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className={styles.notificationClose}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        <RoleTable
          roles={roles}
          loading={loading.roles}
          onEdit={handleEditRole}
          onDelete={handleDeleteRole}
          onBulkAction={handleBulkAction}
          currentUserPermissions={currentUserPermissions}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Modals */}
      <RoleFormModal
        isOpen={modalState === 'create' || modalState === 'edit'}
        mode={modalState === 'edit' ? 'edit' : 'create'}
        role={selectedRole}
        permissions={permissions}
        loading={loading.creating || loading.updating || loading.modal}
        onSubmit={handleSubmitRole}
        onClose={handleCloseModal}
        errors={formErrors}
      />

      <RoleDeleteModal
        isOpen={modalState === 'delete'}
        role={selectedRole}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseModal}
        loading={loading.deleting}
      />
    </div>
  );
};

export default RolesManagement;