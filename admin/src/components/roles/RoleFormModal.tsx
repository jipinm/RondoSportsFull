import React, { useState, useEffect } from 'react';
import type {
  Role,
  Permission,
  RoleFormData,
  RoleFormErrors,
  RoleFormMode
} from '../../types/roles';
import { PermissionSelector } from './PermissionSelector';
import styles from './RoleFormModal.module.css';

interface RoleFormModalProps {
  isOpen: boolean;
  mode: RoleFormMode;
  role?: Role | null;
  permissions: Permission[];
  loading: boolean;
  onSubmit: (data: RoleFormData) => void;
  onClose: () => void;
  errors?: RoleFormErrors;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  mode,
  role,
  permissions,
  loading,
  onSubmit,
  onClose,
  errors = {}
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    selectedPermissions: []
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data when role or mode changes
  useEffect(() => {
    if (mode === 'edit' && role) {
      const permissionIds = Array.isArray(role.permissions) ? role.permissions.map(p => p.id) : [];
      
      setFormData({
        name: role.name,
        description: role.description,
        selectedPermissions: permissionIds
      });
    } else {
      setFormData({
        name: '',
        description: '',
        selectedPermissions: []
      });
    }
    setTouched({});
  }, [role, mode, isOpen]);

  const handleInputChange = (field: keyof RoleFormData, value: string | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submit triggered');
    console.log('Current form data:', formData);
    console.log('Form validation:', {
      nameValid: formData.name.trim().length >= 3 && formData.name.trim().length <= 50,
      descriptionValid: formData.description.trim().length >= 10 && formData.description.trim().length <= 255,
      permissionsValid: formData.selectedPermissions.length > 0,
      isFormValid: isFormValid()
    });
    
    // Mark all fields as touched for validation display
    setTouched({
      name: true,
      description: true,
      selectedPermissions: true
    });

    // Basic client-side validation
    const clientErrors: RoleFormErrors = {};
    
    if (!formData.name.trim()) {
      clientErrors.name = 'Role name is required';
    } else if (formData.name.length < 3) {
      clientErrors.name = 'Role name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      clientErrors.name = 'Role name must be 50 characters or less';
    }

    if (!formData.description.trim()) {
      clientErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      clientErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 255) {
      clientErrors.description = 'Description must be 255 characters or less';
    }

    if (formData.selectedPermissions.length === 0) {
      clientErrors.selectedPermissions = 'At least one permission must be selected';
    }

    console.log('Client-side validation errors:', clientErrors);

    // If there are client-side errors, don't submit
    if (Object.keys(clientErrors).length > 0) {
      console.log('Form submission blocked due to validation errors');
      return;
    }

    console.log('Calling onSubmit with form data');
    onSubmit(formData);
  };

  const getFieldError = (field: keyof RoleFormErrors) => {
    if (touched[field]) {
      // Client-side validation
      if (field === 'name') {
        if (!formData.name.trim()) return 'Role name is required';
        if (formData.name.length < 3) return 'Role name must be at least 3 characters';
        if (formData.name.length > 50) return 'Role name must be 50 characters or less';
      }
      
      if (field === 'description') {
        if (!formData.description.trim()) return 'Description is required';
        if (formData.description.length < 10) return 'Description must be at least 10 characters';
        if (formData.description.length > 255) return 'Description must be 255 characters or less';
      }

      if (field === 'selectedPermissions' && formData.selectedPermissions.length === 0) {
        return 'At least one permission must be selected';
      }
    }
    
    // Server-side validation errors
    return errors[field];
  };

  const isFormValid = () => {
    return formData.name.trim().length >= 3 &&
           formData.name.trim().length <= 50 &&
           formData.description.trim().length >= 10 &&
           formData.description.trim().length <= 255 &&
           formData.selectedPermissions.length > 0;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Create New Role' : 'Edit Role'}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.modalBody}>
            {/* General Error */}
            {errors.general && (
              <div className={styles.errorAlert}>
                {errors.general}
              </div>
            )}

            {/* Role Name */}
            <div className={styles.formGroup}>
              <label htmlFor="roleName" className={styles.label}>
                Role Name *
              </label>
              <input
                id="roleName"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                className={`${styles.input} ${getFieldError('name') ? styles.inputError : ''}`}
                placeholder="Enter role name"
                disabled={loading || (mode === 'edit' && role?.is_system)}
                maxLength={50}
              />
              {getFieldError('name') && (
                <span className={styles.errorText}>{getFieldError('name')}</span>
              )}
              <div className={styles.characterCount}>
                {formData.name.length}/50 characters
              </div>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="roleDescription" className={styles.label}>
                Description *
              </label>
              <textarea
                id="roleDescription"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                className={`${styles.textarea} ${getFieldError('description') ? styles.inputError : ''}`}
                placeholder="Enter role description"
                disabled={loading}
                rows={3}
                maxLength={255}
              />
              {getFieldError('description') && (
                <span className={styles.errorText}>{getFieldError('description')}</span>
              )}
              <div className={styles.characterCount}>
                {formData.description.length}/255 characters
              </div>
            </div>

            {/* Permissions */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Permissions *
              </label>
              <PermissionSelector
                permissions={permissions}
                selectedPermissions={formData.selectedPermissions}
                onChange={(selectedIds: number[]) => handleInputChange('selectedPermissions', selectedIds)}
                disabled={loading}
                error={getFieldError('selectedPermissions')}
              />
              {getFieldError('selectedPermissions') && (
                <span className={styles.errorText}>{getFieldError('selectedPermissions')}</span>
              )}
            </div>

            {/* Role Info for Edit Mode */}
            {mode === 'edit' && role && (
              <div className={styles.roleInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Type:</span>
                  <span className={`${styles.badge} ${role.is_system ? styles.systemBadge : styles.customBadge}`}>
                    {role.is_system ? 'System Role' : 'Custom Role'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Users Assigned:</span>
                  <span>{role.user_count || 0}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Created:</span>
                  <span>{new Date(role.created_at).toLocaleDateString()}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Last Updated:</span>
                  <span>{new Date(role.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                mode === 'create' ? 'Create Role' : 'Update Role'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};