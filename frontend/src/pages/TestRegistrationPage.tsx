import React, { useState } from 'react';
import { useAuth, ApiValidationError } from '../services/customerAuth';
import { 
  validateUserDetails, 
  type UserDetailsFormData,
  type ValidationError
} from '../utils/validation';
import styles from './CheckoutPage.module.css';

const TestRegistrationPage: React.FC = () => {
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
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const { register, login } = useAuth();

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

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsLoginLoading(true);
    try {
      setAuthError('');
      await login({ email: loginData.email, password: loginData.password });
      setAuthError('🎉 Login successful! Welcome back!');
      
      // You could redirect to dashboard or another page here
      console.log('User logged in successfully');
      
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateAccountCreation()) {
      return;
    }

    setIsLoading(true);

    try {
      setAuthError('');
      const registerData = {
        email: userDetails.email,
        password: password,
        first_name: userDetails.firstName,
        last_name: userDetails.lastName,
        phone: userDetails.phone,
        street: userDetails.street,
        locality: userDetails.city,
        postcode: userDetails.zipCode,
        country: userDetails.country
      };
      
      console.log('Registration data:', registerData);
      
      await register(registerData);
      setAuthError('🎉 Account created successfully! Please use the login form below to sign in with your new credentials.');
      
      // Show login form with pre-filled email
      setShowLoginForm(true);
      setLoginData({ email: userDetails.email, password: '' });
      
      // Clear registration form after successful registration
      setUserDetails({
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
      setPassword('');
      setConfirmPassword('');
      setAcceptTerms(false);
      
    } catch (err: any) {
      console.error('🚨 Registration error caught in component:', err);
      console.error('🚨 Error type:', err.constructor.name);
      console.error('🚨 Error message:', err.message);
      console.error('🚨 Full error object:', JSON.stringify(err, null, 2));
      console.error('🚨 Error stack:', err.stack);
      
      // Handle ApiValidationError with field-specific details
      if (err instanceof ApiValidationError) {
        console.log('🔍 Handling ApiValidationError with fieldErrors:', err.fieldErrors);
        
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          const fieldValidationErrors: ValidationError[] = [];
          
          Object.entries(err.fieldErrors).forEach(([field, message]) => {
            console.log(`🔸 Adding field error: ${field} -> ${message}`);
            fieldValidationErrors.push({ field, message });
          });
          
          setValidationErrors(fieldValidationErrors);
          setAuthError(''); // Clear general error when we have field-specific errors
          console.log('✅ Set field validation errors:', fieldValidationErrors);
        } else {
          // ApiValidationError but no fieldErrors, use the general message
          console.log('🔸 ApiValidationError with no fieldErrors, using message:', err.message);
          setAuthError(err.message);
        }
      } 
      // Handle specific validation errors by message content
      else if (err.message && err.message.includes('Email is already registered')) {
        console.log('🔸 Handling specific email error');
        setValidationErrors([{ field: 'email', message: err.message }]);
        setAuthError('');
      } 
      // Handle other validation-related errors
      else if (err.message && (err.message.toLowerCase().includes('validation') || err.message.toLowerCase().includes('invalid'))) {
        console.log('🔸 Handling general validation error:', err.message);
        setAuthError(err.message);
      } 
      // Handle general errors
      else {
        console.log('🔸 Handling general error:', err.message);
        console.log('🔸 Full error object keys:', Object.keys(err));
        
        // Try to extract any detailed validation info from the error
        if (err.responseData && err.responseData.details) {
          console.log('🔸 Found responseData.details in general error:', err.responseData.details);
          
          const details = err.responseData.details;
          if (typeof details === 'object') {
            const fieldValidationErrors: ValidationError[] = [];
            Object.entries(details).forEach(([field, message]) => {
              if (typeof message === 'string') {
                fieldValidationErrors.push({ field, message });
              }
            });
            
            if (fieldValidationErrors.length > 0) {
              setValidationErrors(fieldValidationErrors);
              setAuthError('');
              return;
            }
          }
        }
        
        setAuthError(err.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container} style={{ gridTemplateColumns: '1fr', maxWidth: '600px' }}>
          <div className={styles.checkoutContent}>
            <h1>Test Customer Registration</h1>
            
            <div className={styles.authSection}>
              <h2>Create Your Account</h2>
              <p>Please fill in all required fields to create your account.</p>

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
                    <select 
                      id="country" 
                      className={styles.formSelect}
                      value={userDetails.country}
                      onChange={(e) => handleUserDetailsChange('country', e.target.value)}
                    >
                      <option value="">Select a country</option>
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="NL">Netherlands</option>
                      <option value="BE">Belgium</option>
                      <option value="CH">Switzerland</option>
                      <option value="AT">Austria</option>
                      <option value="IN">India</option>
                    </select>
                    {validationErrors.find(e => e.field === 'country') && (
                      <div className={styles.errorMessage}>
                        {validationErrors.find(e => e.field === 'country')?.message}
                      </div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone">Phone *</label>
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

                {/* Full width terms section */}
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

              {showLoginForm && (
                <div className={styles.authSection} style={{ marginTop: '2rem', borderTop: '2px solid #e5e7eb', paddingTop: '2rem' }}>
                  <h2 style={{ color: '#059669', marginBottom: '1rem' }}>🔐 Sign In to Your Account</h2>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="loginEmail">Email</label>
                      <input
                        type="email"
                        id="loginEmail"
                        placeholder="Enter your email"
                        className={styles.formInput}
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="loginPassword">Password</label>
                      <input
                        type="password"
                        id="loginPassword"
                        placeholder="Enter your password"
                        className={styles.formInput}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className={styles.stepActions}>
                    <button 
                      className={styles.primaryButton}
                      onClick={handleLogin}
                      disabled={isLoginLoading}
                      type="button"
                    >
                      {isLoginLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                    
                    <button 
                      className={styles.secondaryButton}
                      onClick={() => {
                        setShowLoginForm(false);
                        setAuthError('');
                        setLoginData({ email: '', password: '' });
                      }}
                      type="button"
                      style={{ marginLeft: '10px' }}
                    >
                      Back to Registration
                    </button>
                  </div>
                </div>
              )}
              
              {!showLoginForm && (
                <div className={styles.stepActions}>
                  <button 
                    className={styles.primaryButton}
                    onClick={handleRegister}
                    disabled={isLoading}
                    type="button"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                  
                  <button 
                    className={styles.secondaryButton}
                    onClick={() => {
                      // Test with a known existing email to trigger validation error
                      setUserDetails(prev => ({
                        ...prev,
                        email: 'test@existing.com',
                        firstName: 'Test',
                        lastName: 'User',
                        phone: '1234567890',
                        street: '123 Test St',
                        city: 'Test City',
                        zipCode: '12345',
                        country: 'GB'
                      }));
                      setPassword('testpassword123');
                      setConfirmPassword('testpassword123');
                      setAcceptTerms(true);
                    }}
                    type="button"
                    style={{ marginLeft: '10px' }}
                  >
                    Fill Test Data (Existing Email)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TestRegistrationPage;