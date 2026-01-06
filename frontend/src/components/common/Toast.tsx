import React, { useEffect } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.toastContent}>
        <span className={styles.toastIcon}>
          {type === 'error' && '⚠️'}
          {type === 'warning' && '⚠️'}
          {type === 'success' && '✓'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className={styles.toastMessage}>{message}</span>
      </div>
      <button 
        className={styles.toastClose} 
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
