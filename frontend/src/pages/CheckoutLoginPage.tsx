import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Mail } from 'lucide-react';
import { useAuth, ApiValidationError } from '../services/customerAuth';
import type { CustomerRegistrationData } from '../services/customerAuth';
import { LoginForm, ForgotPasswordForm } from '../components/auth/AuthForms';
import CountrySelect from '../components/CountrySelect';
import { 
  validateUserDetails, 
  type UserDetailsFormData,
  type ValidationError
} from '../utils/validation';
import type { Ticket } from '../services/apiRoutes';
import styles from './CheckoutPage.module.css';

interface CartItem {
  ticket: Ticket;
  quantity: number;
  finalPriceUSD?: number;  // Pre-calculated final price in USD
  markupAmount?: number;    // Markup amount applied
}

interface CheckoutState {
  cartItems: CartItem[];
  eventData: {
    event_name: string;
    tournament_name: string;
    season: string;
    date_start: string;
    venue_name: string;
    city: string;
  };
  guestRequirements?: import('../services/apiRoutes').EventGuestRequirements | null;
  markupsData?: Record<string, any>;
  selectedCurrencyCode?: string;
}

const CheckoutLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState;
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [authError, setAuthError] = useState<string>('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
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

  const { customer, isAuthenticated, isLoading, login, register, forgotPassword } = useAuth();

  // Redirect if no cart items
  useEffect(() => {
    if (!state || !state.cartItems || state.cartItems.length === 0) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      navigate('/checkout/guest-details', { 
        state: { ...state, userInfo: customer } 
      });
    }
  }, [isAuthenticated, customer, navigate, state]);

  // Early return if no state
  if (!state || !state.cartItems) {
    return null;
  }

  const { cartItems, eventData } = state;

  // Get the currency used for this checkout (from navigation state)
  const checkoutCurrency = state.selectedCurrencyCode || 'USD';

  // Calculate totals using pre-calculated final prices
  const subtotal = cartItems.reduce((total, item) => {
    const price = item.finalPriceUSD !== undefined ? item.finalPriceUSD : item.ticket.face_value;
    return total + (price * item.quantity);
  }, 0);

  const orderTotal = subtotal;

  const formatPrice = (amount: number) => {
    return `${checkoutCurrency} ${amount.toFixed(2)}`;
  };

  // Authentication handlers
  const handleLogin = async (data: { email: string; password: string }) => {
    try {
      setAuthError('');
      await login(data);
      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please try again.');
    }
  };

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

  const handleRegister = async () => {
    if (!validateAccountCreation()) {
      return;
    }

    try {
      setAuthError('');
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
      setAuthError('🎉 Account created successfully! Please sign in with your credentials.');
      
      // Clear form data
      setPassword('');
      setConfirmPassword('');
      setAcceptTerms(false);
      setValidationErrors([]);
      
      // Store user details for later use in guest details and pre-fill email in login
      sessionStorage.setItem('userDetails', JSON.stringify(userDetails));
      sessionStorage.setItem('registeredEmail', userDetails.email);
      
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
  };

  const handleForgotPassword = async (email: string) => {
    try {
      setAuthError('');
      await forgotPassword(email);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  // Render order summary
  const renderOrderSummary = () => (
    <div className={styles.orderSummary}>
      <h3>Order overview</h3>
      <div className={styles.eventInfo}>
        <h4>{eventData.event_name}</h4>
        <div className={styles.eventDetails}>
          <p>📅 {new Date(eventData.date_start).toLocaleDateString()}</p>
          <p>📍 {eventData.venue_name}, {eventData.city}</p>
        </div>
      </div>

      <div className={styles.ticketSummary}>
        {cartItems.map((item, index) => {
          const price = item.finalPriceUSD !== undefined ? item.finalPriceUSD : item.ticket.face_value;
          return (
            <div key={index} className={styles.ticketItem}>
              <div className={styles.ticketDetails}>
                <span className={styles.ticketName}>{item.ticket.ticket_title}</span>
                <span className={styles.ticketQuantity}>Qty: {item.quantity}</span>
              </div>
              <span className={styles.ticketPrice}>
                {formatPrice(price * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.orderTotals}>
        <div className={styles.totalRow}>
          <span>Order total</span>
          <span>{formatPrice(orderTotal)}</span>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (authMode === 'login') {
      return (
        <div className={styles.stepContent}>
          <h2>Sign In</h2>
          <p>Please sign in to your account to continue with your booking.</p>
          
          <LoginForm
            onSubmit={handleLogin}
            onSwitchToRegister={() => {
              setAuthMode('register');
              setAuthError('');
              setForgotPasswordSuccess(false);
            }}
            onForgotPassword={() => {
              setAuthMode('forgot-password');
              setAuthError('');
              setForgotPasswordSuccess(false);
            }}
            isLoading={isLoading}
            error={authError}
          />
        </div>
      );
    }

    if (authMode === 'register') {
      return (
        <div className={styles.stepContent}>
          <h2>Create Account</h2>
          <p>Enter your details to create a new account for booking.</p>
          
          <form className={styles.guestForm}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
                    {validationErrors.find(e => e.field === 'lastName')?.message}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
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
                  <div className={styles.errorMessage}>
                    {validationErrors.find(e => e.field === 'email')?.message}
                  </div>
                )}
              </div>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
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
                  <div className={styles.errorMessage}>
                    {validationErrors.find(e => e.field === 'confirmPassword')?.message}
                  </div>
                )}
              </div>
            </div>

            {/* Full width terms section outside of grid */}
            <div className={styles.fullWidthSection}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="acceptTerms" className={styles.checkboxLabel}>
                  I accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> *
                </label>
              </div>
              {validationErrors.find(e => e.field === 'acceptTerms') && (
                <div className={styles.errorMessage}>
                  {validationErrors.find(e => e.field === 'acceptTerms')?.message}
                </div>
              )}
            </div>
          </form>

          {authError && (
            <div className={
              authError.toLowerCase().includes('successful') || 
              authError.toLowerCase().includes('created') ||
              authError.toLowerCase().includes('success') ||
              authError.includes('✅') ||
              authError.includes('🎉')
                ? styles.successMessage 
                : styles.errorMessage
            }>
              {authError}
            </div>
          )}
          
          <div className={styles.stepActions}>
            <button 
              className={styles.secondaryButton}
              onClick={() => setAuthMode('login')}
            >
              Back to Sign In
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </div>
      );
    }

    if (authMode === 'forgot-password') {
      return (
        <div className={styles.stepContent}>
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBackToLogin={() => {
              setAuthMode('login');
              setAuthError('');
              setForgotPasswordSuccess(false);
            }}
            isLoading={isLoading}
            error={authError}
            success={forgotPasswordSuccess}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Left column - Form content */}
          <div className={styles.leftColumn}>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepItem} ${styles.active}`}>
                <div className={styles.stepIcon}>
                  <User size={16} />
                </div>
                <span className={styles.stepLabel}>Sign In</span>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepIcon}>
                  <Mail size={16} />
                </div>
                <span className={styles.stepLabel}>Guest Info</span>
              </div>
              <div className={styles.stepItem}>
                <div className={styles.stepIcon}>
                  <Lock size={16} />
                </div>
                <span className={styles.stepLabel}>Payment</span>
              </div>
            </div>
            {renderMainContent()}
          </div>

          {/* Right column - Order summary */}
          <div className={styles.rightColumn}>
            {renderOrderSummary()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutLoginPage;