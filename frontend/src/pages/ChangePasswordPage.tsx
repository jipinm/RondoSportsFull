import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import styles from './ChangePasswordPage.module.css';

const ChangePasswordPage: React.FC = () => {
  const { customer, isAuthenticated, changePassword } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  React.useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/login');
    }
  }, [isAuthenticated, customer, navigate]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    // Validate new password strength
    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setError('Password requirements not met:\n' + passwordErrors.join('\n'));
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_new_password: formData.confirmPassword
      });

      setSuccess('Password changed successfully! You can now use your new password to log in.');
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect to profile after a delay
      setTimeout(() => {
        navigate('/profile');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: 'Enter a password', color: '#e2e8f0' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: '#e53e3e' };
    if (score <= 3) return { score, label: 'Fair', color: '#dd6b20' };
    if (score <= 4) return { score, label: 'Good', color: '#38a169' };
    return { score, label: 'Strong', color: '#22543d' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  if (!isAuthenticated || !customer) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Change Password</h1>
          <Link to="/profile" className={styles.backButton}>
            Back to Profile
          </Link>
        </div>

        {error && (
          <div className={styles.error}>
            {error.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}

        {success && (
          <div className={styles.success}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password *</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                required
                className={styles.input}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className={styles.toggleButton}
                aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
              >
                {showPasswords.current ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password *</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                required
                className={styles.input}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className={styles.toggleButton}
                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
              >
                {showPasswords.new ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            
            {formData.newPassword && (
              <div className={styles.passwordStrength}>
                <div className={styles.strengthBar}>
                  <div 
                    className={styles.strengthFill}
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  />
                </div>
                <span style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
                className={styles.input}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className={styles.toggleButton}
                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
              >
                {showPasswords.confirm ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <div className={styles.mismatchWarning}>
                Passwords do not match
              </div>
            )}
          </div>

          <div className={styles.requirements}>
            <h3>Password Requirements:</h3>
            <ul>
              <li className={formData.newPassword.length >= 8 ? styles.met : ''}>
                At least 8 characters long
              </li>
              <li className={/[A-Z]/.test(formData.newPassword) ? styles.met : ''}>
                At least one uppercase letter (A-Z)
              </li>
              <li className={/[a-z]/.test(formData.newPassword) ? styles.met : ''}>
                At least one lowercase letter (a-z)
              </li>
              <li className={/\d/.test(formData.newPassword) ? styles.met : ''}>
                At least one number (0-9)
              </li>
              <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? styles.met : ''}>
                At least one special character (!@#$%^&*...)
              </li>
            </ul>
          </div>

          <button 
            type="submit" 
            disabled={loading || passwordStrength.score < 3}
            className={styles.submitButton}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        <div className={styles.securityTip}>
          <h3>💡 Security Tips:</h3>
          <ul>
            <li>Use a unique password that you don't use for other accounts</li>
            <li>Consider using a password manager to generate and store strong passwords</li>
            <li>Never share your password with anyone</li>
            <li>Change your password regularly for better security</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;