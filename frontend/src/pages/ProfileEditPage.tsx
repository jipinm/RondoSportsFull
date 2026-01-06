import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import type { CustomerProfile, ProfileUpdateData, AddressUpdateData } from '../services/customerAuth';
import CountrySelect from '../components/CountrySelect';
import styles from './ProfileEditPage.module.css';

const ProfileEditPage: React.FC = () => {
  const { customer, isAuthenticated, getProfile, updateProfile, updateAddress } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'address'>('personal');

  // Form states
  const [personalData, setPersonalData] = useState<ProfileUpdateData>({});
  const [addressData, setAddressData] = useState<AddressUpdateData>({});

  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        setProfile(profileData);
        
        // Initialize form data
        setPersonalData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || ''
        });

        setAddressData({
          street: profileData.street || '',
          house_number: profileData.house_number || '',
          zipcode: profileData.zipcode || '',
          city: profileData.city || '',
          country_code: profileData.country_code || ''
        });

      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, customer, getProfile, navigate]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(personalData);
      setSuccess('Personal information updated successfully!');
      
      // Refresh profile data
      const updatedProfile = await getProfile();
      setProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to update personal information');
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateAddress(addressData);
      setSuccess('Address updated successfully!');
      
      // Refresh profile data
      const updatedProfile = await getProfile();
      setProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !customer) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Edit Profile</h1>
          <div className={styles.loading}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Edit Profile</h1>
          <div className={styles.error}>
            {error}
          </div>
          <Link to="/profile" className={styles.backButton}>
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Edit Profile</h1>
          <Link to="/profile" className={styles.backButton}>
            Back to Profile
          </Link>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div className={styles.success}>
            {success}
          </div>
        )}

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'personal' ? styles.active : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'address' ? styles.active : ''}`}
            onClick={() => setActiveTab('address')}
          >
            Address
          </button>
        </div>

        {activeTab === 'personal' && (
          <form onSubmit={handlePersonalSubmit} className={styles.form}>
            <h2>Personal Information</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                value={personalData.first_name || ''}
                onChange={(e) => setPersonalData({...personalData, first_name: e.target.value})}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                value={personalData.last_name || ''}
                onChange={(e) => setPersonalData({...personalData, last_name: e.target.value})}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={personalData.phone || ''}
                onChange={(e) => setPersonalData({...personalData, phone: e.target.value})}
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={saving} className={styles.submitButton}>
              {saving ? 'Saving...' : 'Save Personal Info'}
            </button>
          </form>
        )}

        {activeTab === 'address' && (
          <form onSubmit={handleAddressSubmit} className={styles.form}>
            <h2>Address Information</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="street">Street</label>
              <input
                type="text"
                id="street"
                value={addressData.street || ''}
                onChange={(e) => setAddressData({...addressData, street: e.target.value})}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="house_number">House Number</label>
              <input
                type="text"
                id="house_number"
                value={addressData.house_number || ''}
                onChange={(e) => setAddressData({...addressData, house_number: e.target.value})}
                className={styles.input}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  value={addressData.city || ''}
                  onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="zipcode">ZIP Code</label>
                <input
                  type="text"
                  id="zipcode"
                  value={addressData.zipcode || ''}
                  onChange={(e) => setAddressData({...addressData, zipcode: e.target.value})}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="country">Country</label>
              <CountrySelect
                value={addressData.country_code || ''}
                onChange={(value) => setAddressData({...addressData, country_code: value})}
                placeholder="Select a country..."
                disabled={saving}
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={saving} className={styles.submitButton}>
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileEditPage;