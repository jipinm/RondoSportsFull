import React, { useState } from 'react';
import type { CustomerRegistrationData, CustomerLoginData } from '../../services/customerAuth';
import CountrySelect from '../CountrySelect';
import styles from './AuthForms.module.css';

interface LoginFormProps {
  onSubmit: (data: CustomerLoginData) => Promise<void>;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToRegister,
  onForgotPassword,
  isLoading = false,
  error
}) => {
  const [formData, setFormData] = useState<CustomerLoginData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerLoginData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerLoginData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CustomerLoginData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={styles.authForm}>
      <div className={styles.formHeader}>
        <h2>Sign In</h2>
        <p>Enter your credentials to access your account</p>
      </div>

      {error && (
        <div className={
          error.toLowerCase().includes('successful') || 
          error.toLowerCase().includes('created') ||
          error.toLowerCase().includes('success') ||
          error.includes('✅') ||
          error.includes('🎉')
            ? styles.successMessage 
            : styles.errorMessage
        }>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <span className={styles.fieldError}>{errors.email}</span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && (
            <span className={styles.fieldError}>{errors.password}</span>
          )}
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onForgotPassword}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>

        <div className={styles.switchForm}>
          <span>Don't have an account? </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
};

interface RegisterFormProps {
  onSubmit: (data: CustomerRegistrationData) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
  error?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onSwitchToLogin,
  isLoading = false,
  error
}) => {
  const [formData, setFormData] = useState<CustomerRegistrationData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    country_code: '',
    city: '',
    street: '',
    house_number: '',
    zipcode: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerRegistrationData>>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerRegistrationData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
    } else if (formData.password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }

    if (!formData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.country_code) {
      newErrors.country_code = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !confirmPasswordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CustomerRegistrationData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCountryChange = (countryCode: string, _countryName: string) => {
    setFormData(prev => ({ ...prev, country_code: countryCode }));
    
    // Clear error when user selects a country
    if (errors.country_code) {
      setErrors(prev => ({ ...prev, country_code: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    // Clear error when user starts typing
    if (confirmPasswordError) {
      setConfirmPasswordError('');
    }
  };

  return (
    <div className={styles.authForm}>
      <div className={styles.formHeader}>
        <h2>Create Account</h2>
        <p>Join us to book tickets and manage your reservations</p>
      </div>

      {error && (
        <div className={
          error.toLowerCase().includes('successful') || 
          error.toLowerCase().includes('created') ||
          error.toLowerCase().includes('success') ||
          error.includes('✅') ||
          error.includes('🎉')
            ? styles.successMessage 
            : styles.errorMessage
        }>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="first_name" className={styles.label}>
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.first_name ? styles.inputError : ''}`}
              placeholder="Enter your first name"
              disabled={isLoading}
            />
            {errors.first_name && (
              <span className={styles.fieldError}>{errors.first_name}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="last_name" className={styles.label}>
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.last_name ? styles.inputError : ''}`}
              placeholder="Enter your last name"
              disabled={isLoading}
            />
            {errors.last_name && (
              <span className={styles.fieldError}>{errors.last_name}</span>
            )}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <span className={styles.fieldError}>{errors.email}</span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
            placeholder="Create a password (min. 6 characters)"
            disabled={isLoading}
          />
          {errors.password && (
            <span className={styles.fieldError}>{errors.password}</span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            className={`${styles.input} ${confirmPasswordError ? styles.inputError : ''}`}
            placeholder="Confirm your password"
            disabled={isLoading}
          />
          {confirmPasswordError && (
            <span className={styles.fieldError}>{confirmPasswordError}</span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="phone" className={styles.label}>
            Phone Number <span className={styles.optional}>(Optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your phone number"
            disabled={isLoading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="street" className={styles.label}>
            Street <span className={styles.optional}>(Optional)</span>
          </label>
          <input
            type="text"
            id="street"
            name="street"
            value={formData.street}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your street address"
            disabled={isLoading}
          />
        </div>

        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="house_number" className={styles.label}>
              House Number <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              type="text"
              id="house_number"
              name="house_number"
              value={formData.house_number}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="House number"
              disabled={isLoading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="zipcode" className={styles.label}>
              ZIP Code <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              type="text"
              id="zipcode"
              name="zipcode"
              value={formData.zipcode}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="ZIP code"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="country" className={styles.label}>
              Country
            </label>
            <CountrySelect
              value={formData.country_code}
              onChange={handleCountryChange}
              placeholder="Select a country..."
              disabled={isLoading}
              error={errors.country_code}
              className={styles.countrySelect}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="city" className={styles.label}>
              City <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter your city"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className={styles.switchForm}>
          <span>Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
};

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  onBackToLogin,
  isLoading = false,
  error,
  success = false
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) return;

    try {
      await onSubmit(email);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  if (success) {
    return (
      <div className={styles.authForm}>
        <div className={styles.formHeader}>
          <h2>Check Your Email</h2>
          <p>We've sent password reset instructions to {email}</p>
        </div>

        <div className={styles.successMessage}>
          <p>If an account with that email exists, you'll receive an email with instructions to reset your password.</p>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className={styles.submitButton}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.formHeader}>
        <h2>Reset Password</h2>
        <p>Enter your email address and we'll send you instructions to reset your password</p>
      </div>

      {error && (
        <div className={
          error.toLowerCase().includes('successful') || 
          error.toLowerCase().includes('created') ||
          error.toLowerCase().includes('success') ||
          error.includes('✅') ||
          error.includes('🎉')
            ? styles.successMessage 
            : styles.errorMessage
        }>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            className={`${styles.input} ${emailError ? styles.inputError : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {emailError && (
            <span className={styles.fieldError}>{emailError}</span>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Instructions'}
        </button>

        <div className={styles.switchForm}>
          <button
            type="button"
            onClick={onBackToLogin}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </div>
  );
};