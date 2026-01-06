import React, { useState } from 'react';
import { X, DollarSign, AlertTriangle } from 'lucide-react';
import styles from './RefundModal.module.css';

interface RefundModalProps {
  booking: {
    id: string;
    booking_reference: string;
    total_amount: number;
    currency: string;
    refund_amount?: number;
  };
  onClose: () => void;
  onConfirm: (amount: number | null, reason: string, notes: string) => Promise<void>;
}

export const RefundModal: React.FC<RefundModalProps> = ({ booking, onClose, onConfirm }) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('requested_by_customer');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const maxRefundAmount = booking.total_amount - (booking.refund_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (refundType === 'partial') {
      const amount = parseFloat(partialAmount);
      if (isNaN(amount) || amount <= 0 || amount > maxRefundAmount) {
        setError(`Please enter a valid amount between 0 and ${maxRefundAmount.toFixed(2)}`);
        return;
      }
    }

    if (!reason) {
      setError('Please select a refund reason');
      return;
    }

    setIsProcessing(true);

    try {
      const refundAmount = refundType === 'full' ? null : parseFloat(partialAmount);
      await onConfirm(refundAmount, reason, adminNotes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <DollarSign size={24} />
            Process Refund
          </h2>
          <button className={styles.closeButton} onClick={onClose} disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <div className={styles.warningBox}>
            <AlertTriangle size={20} />
            <p>This action will process a refund through Stripe and cannot be undone.</p>
          </div>

          <div className={styles.bookingInfo}>
            <p><strong>Booking:</strong> {booking.booking_reference}</p>
            <p><strong>Total Amount:</strong> {booking.currency} {Number(booking.total_amount).toFixed(2)}</p>
            {booking.refund_amount && Number(booking.refund_amount) > 0 && (
              <p><strong>Already Refunded:</strong> {booking.currency} {Number(booking.refund_amount).toFixed(2)}</p>
            )}
            <p><strong>Available to Refund:</strong> {booking.currency} {maxRefundAmount.toFixed(2)}</p>
          </div>

          <div className={styles.formGroup}>
            <label>Refund Type</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={() => setRefundType('full')}
                  disabled={isProcessing}
                />
                Full Refund ({booking.currency} {maxRefundAmount.toFixed(2)})
              </label>
              <label>
                <input
                  type="radio"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={() => setRefundType('partial')}
                  disabled={isProcessing}
                />
                Partial Refund
              </label>
            </div>
          </div>

          {refundType === 'partial' && (
            <div className={styles.formGroup}>
              <label>Refund Amount ({booking.currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundAmount}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={`Max: ${maxRefundAmount.toFixed(2)}`}
                disabled={isProcessing}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Refund Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
              required
            >
              <option value="requested_by_customer">Requested By Customer</option>
              <option value="duplicate">Duplicate Payment</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Admin Notes (Optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any internal notes about this refund..."
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.refundButton}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
