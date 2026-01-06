import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import styles from './BlockCustomerModal.module.css';

interface BlockCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  customerName: string;
  loading?: boolean;
}

const BlockCustomerModal: React.FC<BlockCustomerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for blocking this customer');
      return;
    }

    if (reason.trim().length > 1000) {
      setError('Reason must not exceed 1000 characters');
      return;
    }

    onConfirm(reason.trim());
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Block Customer" size="md">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.warningSection}>
          <div className={styles.warningIcon}>⚠️</div>
          <div>
            <p className={styles.warningText}>
              You are about to block <strong>{customerName}</strong>
            </p>
            <p className={styles.warningSubtext}>
              This will prevent them from accessing their account and making new bookings.
            </p>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="blockReason" className={styles.label}>
            Reason for blocking <span className={styles.required}>*</span>
          </label>
          <textarea
            id="blockReason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="Please provide a detailed reason for blocking this customer..."
            className={styles.textarea}
            rows={4}
            maxLength={1000}
            disabled={loading}
            autoFocus
          />
          <div className={styles.charCount}>
            {reason.length}/1000 characters
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={loading}
            disabled={!reason.trim() || loading}
          >
            Block Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BlockCustomerModal;