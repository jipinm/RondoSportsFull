import React, { useState } from 'react';
import { Lock, Mail, User, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import styles from './Settings.module.css';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  name: string;
  email: string;
  role: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile settings (read-only)
  const profileForm: ProfileForm = {
    name: user?.name || 'Admin User',
    email: user?.email || 'admin@example.com',
    role: user?.role || 'admin'
  };
  
  // Security settings
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting to change password...');
      
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      // Clear password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Render different form content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Profile Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Full Name</label>
                <div className={styles.inputWithIcon}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileForm.name}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnly}`}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileForm.email}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnly}`}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="role">Role</label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={profileForm.role === 'super_admin' ? 'Super Admin' : profileForm.role.charAt(0).toUpperCase() + profileForm.role.slice(1)}
                  readOnly
                  className={`${styles.formInput} ${styles.readOnly}`}
                />
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Change Password</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">Current Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>
            
            <div className={styles.passwordRequirements}>
              <h3>Password Requirements:</h3>
              <ul>
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <h1 className={styles.pageTitle}>Admin Settings</h1>
      
      <div className={styles.settingsLayout}>
        <div className={styles.settingsSidebar}>
          <button
            className={`${styles.sidebarButton} ${activeTab === 'profile' ? styles.activeButton : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Profile</span>
          </button>
          
          <button
            className={`${styles.sidebarButton} ${activeTab === 'security' ? styles.activeButton : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={20} />
            <span>Change Password</span>
          </button>
        </div>
        
        <div className={styles.settingsContent}>
          {activeTab === 'profile' ? (
            <div>
              {renderTabContent()}
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              {renderTabContent()}
              
              {error && (
                <div className={styles.errorMessage}>
                  <span>{error}</span>
                </div>
              )}
              
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton} disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
                
                {saveSuccess && (
                  <div className={styles.successMessage}>
                    <CheckCircle size={18} />
                    <span>Settings saved successfully!</span>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
