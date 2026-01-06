import React, { useState, useEffect } from 'react';
import type { Role, RoleDeleteValidation } from '../../types/roles';
import { rolesApi } from '../../services/roles-api';
import styles from './RoleDeleteModal.module.css';

interface RoleDeleteModalProps {
  isOpen: boolean;
  role: Role | null;
  onConfirm: (roleId: number, force?: boolean) => void;
  onClose: () => void;
  loading: boolean;
}

export const RoleDeleteModal: React.FC<RoleDeleteModalProps> = ({
  isOpen,
  role,
  onConfirm,
  onClose,
  loading
}) => {
  const [validation, setValidation] = useState<RoleDeleteValidation | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && role) {
      setForceDelete(false);
      setConfirmationText('');
      validateDeletion();
    } else {
      setValidation(null);
      setValidationLoading(false);
    }
  }, [isOpen, role]);

  const validateDeletion = async () => {
    if (!role) return;

    setValidationLoading(true);
    try {
      const response = await rolesApi.validateRoleDeletion(role.id);
      if (response.success && response.data) {
        setValidation(response.data);
      }
    } catch (error) {
      console.error('Error validating role deletion:', error);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!role) return;

    // For system roles or roles with users, require confirmation text
    if (role.is_system || (validation && validation.user_count > 0)) {
      if (confirmationText !== role.name) {
        return;
      }
    }

    onConfirm(role.id, forceDelete);
  };

  const isConfirmationRequired = role && (role.is_system || (validation && validation.user_count > 0));
  const isConfirmationValid = !isConfirmationRequired || confirmationText === role?.name;

  if (!isOpen || !role) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Delete Role</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {validationLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Validating deletion...</p>
            </div>
          ) : (
            <>
              {/* Role Information */}
              <div className={styles.roleInfo}>
                <h3>
                  {role.name}
                  {Boolean(role.is_system) && (
                    <span className={styles.systemBadge}>System Role</span>
                  )}
                </h3>
                <p className={styles.roleDescription}>{role.description}</p>
              </div>

              {/* Deletion Validation Results */}
              {Boolean(validation) && (
                <div className={styles.validationSection}>
                  {validation!.can_delete ? (
                    <div className={styles.successMessage}>
                      <span className={styles.icon}>✅</span>
                      This role can be safely deleted.
                    </div>
                  ) : (
                    <div className={styles.warningMessage}>
                      <span className={styles.icon}>⚠️</span>
                      This role cannot be deleted for the following reasons:
                    </div>
                  )}

                  {/* User Count Warning */}
                  {Boolean(validation!.user_count && validation!.user_count > 0) && (
                    <div className={styles.warningBox}>
                      <h4>Users Assigned</h4>
                      <p>
                        <strong>{validation!.user_count}</strong> user{validation!.user_count !== 1 ? 's' : ''} currently assigned to this role.
                        {Boolean(validation!.can_delete) && (
                          <>
                            <br />
                            <span className={styles.note}>
                              Users will lose the permissions associated with this role.
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {/* System Role Warning */}
                  {Boolean(role.is_system) && (
                    <div className={styles.dangerBox}>
                      <h4>System Role</h4>
                      <p>
                        This is a system role that is critical for application functionality.
                        Deleting it may cause unexpected behavior.
                      </p>
                    </div>
                  )}

                  {/* Additional Warnings */}
                  {Boolean(validation!.warnings && Array.isArray(validation!.warnings) && validation!.warnings.length > 0) && (
                    <div className={styles.warningList}>
                      <h4>Additional Warnings:</h4>
                      <ul>
                        {validation!.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Force Delete Option */}
                  {Boolean(!validation!.can_delete) && (
                    <div className={styles.forceDeleteSection}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={forceDelete}
                          onChange={(e) => setForceDelete(e.target.checked)}
                          disabled={loading}
                        />
                        <span>
                          Force delete this role anyway
                          <br />
                          <small className={styles.forceDeleteNote}>
                            This will remove the role and unassign it from all users. Use with caution.
                          </small>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Input */}
              {Boolean(isConfirmationRequired && (validation?.can_delete || forceDelete)) && (
                <div className={styles.confirmationSection}>
                  <h4>Confirmation Required</h4>
                  <p>
                    This action cannot be undone. To confirm deletion, please type the role name 
                    <strong> {role.name}</strong> in the field below:
                  </p>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={`Type "${role.name}" to confirm`}
                    className={`${styles.confirmationInput} ${
                      confirmationText && confirmationText !== role.name ? styles.inputError : ''
                    }`}
                    disabled={loading}
                  />
                  {Boolean(confirmationText && confirmationText !== role.name) && (
                    <div className={styles.errorText}>
                      Role name does not match. Please type exactly: {role.name}
                    </div>
                  )}
                </div>
              )}
            </>
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
            type="button"
            onClick={handleConfirm}
            className={styles.deleteButton}
            disabled={
              loading || 
              validationLoading || 
              (!validation?.can_delete && !forceDelete) ||
              !isConfirmationValid
            }
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Deleting...
              </>
            ) : (
              <>
                🗑️ Delete Role
                {forceDelete && ' (Force)'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};