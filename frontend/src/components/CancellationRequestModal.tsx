import React, { useState } from 'react';
import styles from './CancellationRequestModal.module.css';

interface CancellationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  bookingReference: string;
  eventName: string;
}

const CancellationRequestModal: React.FC<CancellationRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bookingReference,
  eventName
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(reason);
      // Reset form on success
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit cancellation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Request Cancellation</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.bookingInfo}>
            <p className={styles.infoLabel}>Booking Reference</p>
            <p className={styles.infoValue}>#{bookingReference}</p>
            
            <p className={styles.infoLabel}>Event</p>
            <p className={styles.infoValue}>{eventName}</p>
          </div>

          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>⚠️</span>
            <div>
              <p className={styles.warningTitle}>Important Information</p>
              <ul className={styles.warningList}>
                <li>Your cancellation request will be reviewed by our team</li>
                <li>Refund eligibility depends on the event's cancellation policy</li>
                <li>You will be notified of the decision via email</li>
                <li>This action cannot be undone once submitted</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="reason" className={styles.label}>
                Reason for Cancellation <span className={styles.required}>*</span>
              </label>
              <textarea
                id="reason"
                className={styles.textarea}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your cancellation request..."
                rows={5}
                disabled={isSubmitting}
                required
              />
              <p className={styles.charCount}>
                {reason.length} characters (minimum 10)
              </p>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                <span className={styles.errorIcon}>❌</span>
                {error}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting || reason.trim().length < 10}
              >
                {isSubmitting ? '⏳ Submitting...' : '✓ Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancellationRequestModal;
