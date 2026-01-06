import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import type { CustomerProfile } from '../services/customerAuth';
import styles from './ProfilePage.module.css';

const ProfilePage: React.FC = () => {
  const { customer, isAuthenticated, logout, getProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    
    if (!isAuthenticated || !customer) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        setProfile(profileData);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, customer, getProfile, navigate]);

  if (!isAuthenticated || !customer) {
    // User will be redirected to login in useEffect
    return null;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>My Profile</h1>
          <div className={styles.loading}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>My Profile</h1>
          <div className={styles.error}>
            {error || 'Unable to load profile data'}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>My Profile</h1>
          <div className={styles.headerActions}>
            <Link to="/profile/edit" className={styles.editButton}>
              Edit Profile
            </Link>
            <Link to="/profile/change-password" className={styles.passwordButton}>
              Change Password
            </Link>
          </div>
        </div>
        
        {/* Account Information */}
        <div className={styles.profileSection}>
          <h2>Account Information</h2>
          <div className={styles.profileGrid}>
            <div className={styles.infoItem}>
              <strong>Customer ID:</strong> 
              <span className={styles.customerId}>{profile.customer_id}</span>
            </div>
            <div className={styles.infoItem}>
              <strong>Name:</strong> {profile.first_name} {profile.last_name}
            </div>
            <div className={styles.infoItem}>
              <strong>Email:</strong> {profile.email}
            </div>
            <div className={styles.infoItem}>
              <strong>Phone:</strong> {profile.phone || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>Account Status:</strong> 
              <span className={`${styles.status} ${styles[profile.status?.toLowerCase()]}`}>
                {profile.status}
              </span>
            </div>
            <div className={styles.infoItem}>
              <strong>Email Verified:</strong> 
              <span className={`${styles.verification} ${profile.email_verified ? styles.verified : styles.unverified}`}>
                {profile.email_verified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className={styles.profileSection}>
          <h2>Address Information</h2>
          <div className={styles.profileGrid}>
            <div className={styles.infoItem}>
              <strong>Street:</strong> {profile.street || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>House Number:</strong> {profile.house_number || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>ZIP Code:</strong> {profile.zipcode || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>City:</strong> {profile.city || 'Not provided'}
            </div>
            <div className={styles.infoItem}>
              <strong>Country:</strong> {profile.country || 'Not provided'}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link to="/bookings" className={styles.actionButton}>
            View My Bookings
          </Link>
          <Link to="/profile/edit" className={styles.actionButton}>
            Edit Profile
          </Link>
          <button onClick={logout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;