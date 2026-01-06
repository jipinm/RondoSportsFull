import React, { useState } from 'react';
import { useAuth } from '../../services/customerAuth';
import { LoginForm, RegisterForm, ForgotPasswordForm } from './AuthForms';
import styles from './AuthModal.module.css';

type AuthMode = 'login' | 'register' | 'forgot-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string>('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
  const { login, register, forgotPassword, isLoading } = useAuth();

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = () => {
    setError('');
    onSuccess?.();
    onClose();
  };

  const handleLogin = async (data: { email: string; password: string }) => {
    try {
      setError('');
      await login(data);
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async (data: any) => {
    try {
      setError('');
      await register(data);
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      setError('');
      await forgotPassword(email);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  const switchToLogin = () => {
    setMode('login');
    setError('');
    setForgotPasswordSuccess(false);
  };

  const switchToRegister = () => {
    setMode('register');
    setError('');
    setForgotPasswordSuccess(false);
  };

  const switchToForgotPassword = () => {
    setMode('forgot-password');
    setError('');
    setForgotPasswordSuccess(false);
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        {mode === 'login' && (
          <LoginForm
            onSubmit={handleLogin}
            onSwitchToRegister={switchToRegister}
            onForgotPassword={switchToForgotPassword}
            isLoading={isLoading}
            error={error}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSubmit={handleRegister}
            onSwitchToLogin={switchToLogin}
            isLoading={isLoading}
            error={error}
          />
        )}

        {mode === 'forgot-password' && (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBackToLogin={switchToLogin}
            isLoading={isLoading}
            error={error}
            success={forgotPasswordSuccess}
          />
        )}
      </div>
    </div>
  );
};