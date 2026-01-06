import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import type { CustomerRegistrationData } from '../services/customerAuth';
import { LoginForm, ForgotPasswordForm } from '../components/auth/AuthForms';
import CountrySelect from '../components/CountrySelect';
import { ApiValidationError } from '../services/customerAuth';
import { 
  validateUserDetails, 
  type UserDetailsFormData,
  type ValidationError
} from '../utils/validation';
import { MdSportsFootball, MdVerified, MdSecurity } from 'react-icons/md';
import { FaStar, FaTicketAlt, FaUserShield } from 'react-icons/fa';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, isAuthenticated, isLoading, login, register, forgotPassword } = useAuth();

  // Get redirect path from location state, default to home
  const redirectTo = location.state?.from?.pathname || '/';

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Account creation form state
  const [userDetails, setUserDetails] = useState<UserDetailsFormData>({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    country: '',
    phone: ''
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, customer, navigate, redirectTo]);

  // Clear errors when switching modes
  useEffect(() => {
    setAuthError('');
    setSuccessMessage('');
    setValidationErrors([]);
  }, [authMode]);

  const handleUserDetailsChange = (field: keyof UserDetailsFormData, value: string) => {
    setUserDetails(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const validateAccountCreation = () => {
    const errors: ValidationError[] = [];
    
    // Validate user details
    const userValidation = validateUserDetails(userDetails);
    if (!userValidation.isValid) {
      errors.push(...userValidation.errors);
    }
    
    // Validate passwords
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }
    
    if (password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }
    
    // Validate terms acceptance
    if (!acceptTerms) {
      errors.push({ field: 'acceptTerms', message: 'You must accept the Terms and Conditions' });
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleLogin = async (data: { email: string; password: string }) => {
    setIsSubmitting(true);
    setAuthError('');
    try {
      await login(data);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleRegister = async () => {
    if (!validateAccountCreation()) {
      return;
    }

    setIsSubmitting(true);
    setAuthError('');
    
    try {
      const registerData: CustomerRegistrationData = {
        email: userDetails.email,
        password: password,
        first_name: userDetails.firstName,
        last_name: userDetails.lastName,
        phone: userDetails.phone,
        street: userDetails.street,
        house_number: userDetails.houseNumber,  // Direct database field mapping
        city: userDetails.city,
        zipcode: userDetails.zipCode,  // Direct database field mapping
        country_code: userDetails.country  // Map country to country_code
      };
      
      
      await register(registerData);
      
      // Switch to login mode and show success message
      setAuthMode('login');
      setSuccessMessage('🎉 Account created successfully! Please sign in with your credentials.');
      
      // Clear form data
      setPassword('');
      setConfirmPassword('');
      setAcceptTerms(false);
      setValidationErrors([]);
      
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle ApiValidationError with field-specific details
      if (err instanceof ApiValidationError && err.fieldErrors) {
        const fieldValidationErrors: ValidationError[] = [];
        
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          fieldValidationErrors.push({ field, message });
        });
        
        setValidationErrors(fieldValidationErrors);
        setAuthError(''); // Clear general error when we have field-specific errors
      } 
      // Handle specific validation errors by message content
      else if (err.message === 'Email is already registered') {
        setValidationErrors([{ field: 'email', message: 'This email is already registered. Please use a different email or try signing in.' }]);
        setAuthError('');
      } 
      // Handle other validation-related errors
      else if (err.message && (err.message.includes('validation') || err.message.includes('invalid'))) {
        setAuthError(err.message);
      } 
      // Handle general errors
      else {
        setAuthError(err.message || 'Account creation failed. Please try again.');
      }
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (email: string) => {
    setIsSubmitting(true);
    setAuthError('');
    
    try {
      await forgotPassword(email);
      setSuccessMessage('Password reset instructions have been sent to your email.');
      setAuthMode('login');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send password reset email.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <div className={styles.heroTitle}>
                <span>Welcome to</span>
                <span className={styles.titleHighlight}>RONDO Sports</span>
              </div>
              <p className={styles.heroDescription}>
                {authMode === 'login' && 'Sign in to access your tickets, manage bookings, and discover amazing sports events worldwide.'}
                {authMode === 'register' && 'Join thousands of sports fans and get exclusive access to premium tickets and experiences.'}
                {authMode === 'forgot-password' && 'Reset your password to regain access to your sports tickets and bookings.'}
              </p>
              
              <div className={styles.features}>
                <div className={styles.feature}>
                  <FaTicketAlt className={styles.featureIcon} />
                  <span>Secure Ticket Booking</span>
                </div>
                <div className={styles.feature}>
                  <MdVerified className={styles.featureIcon} />
                  <span>Verified Events</span>
                </div>
                <div className={styles.feature}>
                  <FaUserShield className={styles.featureIcon} />
                  <span>Protected Account</span>
                </div>
              </div>

              {/* Sports Image in Left Area */}
              <div className={styles.imageOverlay}>
                <img 
                  src="/images/events/premier-league-hero.jpg" 
                  alt="Sports Events" 
                  className={styles.heroImage}
                />
                <div className={styles.imageOverlayContent}>
                  <FaStar className={styles.overlayIcon} />
                  <span>Premium Sports Experience</span>
                </div>
              </div>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                  <h2>
                    {authMode === 'register' && 'Create Your Account'}
                  </h2>
                </div>

                {successMessage && (
                  <div className={styles.successMessage}>
                    <MdVerified className={styles.messageIcon} />
                    {successMessage}
                  </div>
                )}

                <div className={styles.authForm}>
                  {authMode === 'login' && (
                    <LoginForm
                      onSubmit={handleLogin}
                      onSwitchToRegister={() => setAuthMode('register')}
                      onForgotPassword={() => setAuthMode('forgot-password')}
                      isLoading={isSubmitting}
                      error={authError}
                    />
                  )}

                  {authMode === 'register' && (
                    <div className={styles.registerForm}>
                      <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="firstName">First name *</label>
                            <input
                              type="text"
                              id="firstName"
                              placeholder="Enter first name"
                              className={styles.formInput}
                              value={userDetails.firstName}
                              onChange={(e) => handleUserDetailsChange('firstName', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'firstName') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'firstName')?.message}
                              </div>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="lastName">Last name *</label>
                            <input
                              type="text"
                              id="lastName"
                              placeholder="Enter last name"
                              className={styles.formInput}
                              value={userDetails.lastName}
                              onChange={(e) => handleUserDetailsChange('lastName', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'lastName') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'lastName')?.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.formGroup}>
                          <label htmlFor="email">Email *</label>
                          <input
                            type="email"
                            id="email"
                            placeholder="Enter email address"
                            className={styles.formInput}
                            value={userDetails.email}
                            onChange={(e) => handleUserDetailsChange('email', e.target.value)}
                          />
                          {validationErrors.find(e => e.field === 'email') && (
                            <div className={styles.fieldError}>
                              {validationErrors.find(e => e.field === 'email')?.message}
                            </div>
                          )}
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="street">Street *</label>
                            <input
                              type="text"
                              id="street"
                              placeholder="Enter street address"
                              className={styles.formInput}
                              value={userDetails.street}
                              onChange={(e) => handleUserDetailsChange('street', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'street') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'street')?.message}
                              </div>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="houseNumber">House number *</label>
                            <input
                              type="text"
                              id="houseNumber"
                              placeholder="House number"
                              className={styles.formInput}
                              value={userDetails.houseNumber}
                              onChange={(e) => handleUserDetailsChange('houseNumber', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'houseNumber') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'houseNumber')?.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="zipCode">Zip code *</label>
                            <input
                              type="text"
                              id="zipCode"
                              placeholder="Zip code"
                              className={styles.formInput}
                              value={userDetails.zipCode}
                              onChange={(e) => handleUserDetailsChange('zipCode', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'zipCode') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'zipCode')?.message}
                              </div>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="city">City *</label>
                            <input
                              type="text"
                              id="city"
                              placeholder="Enter city"
                              className={styles.formInput}
                              value={userDetails.city}
                              onChange={(e) => handleUserDetailsChange('city', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'city') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'city')?.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="country">Country *</label>
                            <CountrySelect
                              value={userDetails.country}
                              onChange={(countryCode: string, _countryName: string) => {
                                handleUserDetailsChange('country', countryCode);
                              }}
                              placeholder="Select a country..."
                              className={styles.formSelect}
                              error={validationErrors.find(e => e.field === 'country')?.message}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="phone">Phone <span style={{color: '#999'}}>(Optional)</span></label>
                            <input
                              type="tel"
                              id="phone"
                              placeholder="Phone number"
                              className={styles.formInput}
                              value={userDetails.phone}
                              onChange={(e) => handleUserDetailsChange('phone', e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'phone') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'phone')?.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label htmlFor="password">Password *</label>
                            <input
                              type="password"
                              id="password"
                              placeholder="Create password (min 8 characters)"
                              className={styles.formInput}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'password') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'password')?.message}
                              </div>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <input
                              type="password"
                              id="confirmPassword"
                              placeholder="Confirm password"
                              className={styles.formInput}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            {validationErrors.find(e => e.field === 'confirmPassword') && (
                              <div className={styles.fieldError}>
                                {validationErrors.find(e => e.field === 'confirmPassword')?.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.termsSection}>
                          <div className={styles.checkboxGroup}>
                            <input
                              type="checkbox"
                              id="acceptTerms"
                              checked={acceptTerms}
                              onChange={(e) => setAcceptTerms(e.target.checked)}
                              className={styles.checkbox}
                            />
                            <label htmlFor="acceptTerms" className={styles.checkboxLabel}>
                              I accept the <a href="/terms-conditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> *
                            </label>
                          </div>
                          {validationErrors.find(e => e.field === 'acceptTerms') && (
                            <div className={styles.fieldError}>
                              {validationErrors.find(e => e.field === 'acceptTerms')?.message}
                            </div>
                          )}
                        </div>

                        <button 
                          type="submit" 
                          className={styles.submitButton}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </button>
                      </form>

                      <div className={styles.switchForm}>
                        <span>Already have an account? </span>
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className={styles.linkButton}
                          disabled={isSubmitting}
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </div>
                  )}

                  {authMode === 'forgot-password' && (
                    <ForgotPasswordForm
                      onSubmit={handleForgotPassword}
                      onBackToLogin={() => setAuthMode('login')}
                      isLoading={isSubmitting}
                      error={authError}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className={styles.trustSection}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <MdSportsFootball className={styles.trustIcon} />
              <h3>500K+ Events</h3>
              <p>Access to worldwide sports events</p>
            </div>
            <div className={styles.trustItem}>
              <MdSecurity className={styles.trustIcon} />
              <h3>Secure Platform</h3>
              <p>Bank-level security for your data</p>
            </div>
            <div className={styles.trustItem}>
              <FaStar className={styles.trustIcon} />
              <h3>5-Star Support</h3>
              <p>24/7 customer service excellence</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;