import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import styles from './DeleteConfirmModal.module.css';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  details?: string[];
  teamName?: string;
  isDeleting?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  details,
  teamName,
  isDeleting = false
}) => {
  // Use provided props or fall back to defaults for backward compatibility
  const modalTitle = title || 'Delete Team Credential';
  const displayName = itemName || teamName || '';
  const modalMessage = message || `Are you sure you want to delete the team credential for "${displayName}"?`;
  const modalDetails = details || [
    'Team credential record from the database',
    'Associated logo image file',
    'Associated banner image file'
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion">
      <div className={styles.content}>
        <div className={styles.warningIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className={styles.message}>
          <h3 className={styles.title}>{modalTitle}</h3>
          <p className={styles.description}>
            {modalMessage}
          </p>
          <div className={styles.warningBox}>
            <p className={styles.warningText}>
              ⚠️ This action cannot be undone. The following will be permanently deleted:
            </p>
            <ul className={styles.warningList}>
              {modalDetails.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={isDeleting}
          className={styles.deleteButton}
        >
          {isDeleting ? 'Deleting...' : 'Delete Permanently'}
        </Button>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
