import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Calendar, MapPin, CreditCard, Lock } from 'lucide-react';
import { useGuestData } from '../hooks/useGuestData';
import { useReservation } from '../hooks/useReservation';
import { useBooking } from '../hooks/useBooking';
import { useAuth } from '../services/customerAuth';
import { LoginForm, RegisterForm, ForgotPasswordForm } from './auth/AuthForms';
import { generateInvoiceReference, generateBookingReference, PAYMENT_METHODS } from '../utils/referenceGenerator';
import { isReservationExpired, getMinutesUntilExpiration } from '../utils/dateUtils';
import type { Ticket, Guest } from '../services/apiRoutes';
import styles from './CheckoutFlow.module.css';

interface CartItem {
  ticket: Ticket;
  quantity: number;
}

interface CheckoutFlowProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  eventData?: {
    event_name: string;
    tournament_name: string;
    season: string;
    date_start: string;
    venue_name: string;
    city: string;
  };
  onBookingComplete?: (bookingId: string) => void;
}

type CheckoutStep = 'guest-data' | 'review' | 'auth' | 'payment';

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  isOpen,
  onClose,
  cartItems,
  eventData,
  onBookingComplete
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('guest-data');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [countryHint] = useState('GBR'); // Default to UK
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [authError, setAuthError] = useState<string>('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const navigate = useNavigate();

  // Hooks for API calls
  const { requirements, loading: guestDataLoading, error: guestDataError, fetchRequirements } = useGuestData();
  const { reservation, loading: reservationLoading, error: reservationError, createReservation, addGuestData } = useReservation();
  const { loading: bookingLoading, error: bookingError, createBooking } = useBooking();
  const { customer, isAuthenticated, isLoading, login, register, forgotPassword } = useAuth();

  // Initialize guest data requirements when checkout opens
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      // Fetch requirements for the first ticket (assuming all tickets have similar requirements)
      const firstTicketId = cartItems[0].ticket.ticket_id;
      fetchRequirements(firstTicketId, countryHint);
      
      // Initialize guests array based on total ticket quantity
      const totalTickets = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      initializeGuests(totalTickets);
    }
  }, [isOpen, cartItems]);

  // Initialize guests array with default values
  const initializeGuests = (totalTickets: number) => {
    const newGuests: Guest[] = [];
    for (let i = 0; i < totalTickets; i++) {
      newGuests.push({
        first_name: '',
        last_name: '',
        contact_email: '',
        date_of_birth: '',
        // Don't set optional fields to undefined - leave them out or use empty string
        country_of_residence: countryHint || '',
        lead_guest: i === 0 // First guest is the lead guest
      });
    }
    setGuests(newGuests);
  };

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.ticket.face_value * item.quantity);
  }, 0);

  // Order total is just the subtotal (no additional booking costs)
  const orderTotal = subtotal;

  // Get currency from first ticket
  const getCurrency = () => {
    if (!cartItems.length) {
      throw new Error('No cart items found for currency determination');
    }
    const currency = cartItems[0].ticket.currency_code;
    if (!currency) {
      throw new Error('Ticket currency is required');
    }
    return currency;
  };

  const formatPrice = (amount: number) => {
    const currency = getCurrency();
    return `${currency} ${amount.toFixed(2)}`;
  };

  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Guest info validation state - changed to object for inline errors
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});

  // Validate individual field
  const validateField = (fieldName: string, value: string | undefined): string => {
    // Ensure value is a string before calling trim
    const stringValue = value?.toString() || '';
    
    if (!stringValue || stringValue.trim() === '') {
      return `This field is required`;
    }
    
    if (fieldName === 'contact_email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue.trim())) {
        return 'Please enter a valid email address';
      }
    }
    
    return '';
  };

  // Simplified validation function
  const validateGuestData = (): boolean => {
    if (!guests || guests.length === 0) {
      return false;
    }
    
    const errors: {[key: string]: string} = {};
    let hasErrors = false;

    // Essential fields that must be filled
    const essentialFields = ['first_name', 'last_name', 'contact_email', 'date_of_birth'];

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      
      // Validate essential fields
      for (const field of essentialFields) {
        const value = guest[field as keyof Guest];
        const error = validateField(field, value as string);
        if (error) {
          errors[`guest_${i}_${field}`] = error;
          hasErrors = true;
        }
      }
    }
    
    setFieldErrors(errors);
    return !hasErrors;
  };

  // Clear error for specific field when user starts typing
  const clearFieldError = (guestIndex: number, fieldName: string) => {
    const fieldKey = `guest_${guestIndex}_${fieldName}`;
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Enhanced handle guest change with validation
  const handleGuestChange = (guestIndex: number, field: keyof Guest, value: string) => {
    const updatedGuests = [...guests];
    updatedGuests[guestIndex] = {
      ...updatedGuests[guestIndex],
      [field]: value
    };
    setGuests(updatedGuests);
    
    // Clear error when user starts typing
    clearFieldError(guestIndex, field as string);
  };

  // Handle proceeding to review step
  const handleProceedToReview = () => {
    if (validateGuestData()) {
      setCurrentStep('review');
    }
  };

  // Handle creating reservation with the new 3-step process
  const handleCreateReservation = async () => {
    
    // Get lead guest for later guest data submission
    const leadGuest = guests.find(g => g.lead_guest);
    if (!leadGuest || !leadGuest.contact_email) {
      console.error('Lead guest email is required for reservation');
      return;
    }

    // Step 1: Create reservation with XS2Event API format (simplified)
    const reservationData = {
      items: cartItems.map(item => ({
        ticket_id: item.ticket.ticket_id,
        quantity: item.quantity,
        net_rate: item.ticket.net_rate,
        currency_code: item.ticket.currency_code || 'GBP' // Required by XS2Event API
      }))
    };


    const newReservation = await createReservation(reservationData);
    if (!newReservation) {
      console.error('Failed to create reservation');
      return;
    }


    // Step 2: Add guest data to the reservation
    const guestDataSuccess = await addGuestData(newReservation.reservation_id, guests);
    if (!guestDataSuccess) {
      console.error('Failed to add guest data to reservation');
      return;
    }


    setCurrentStep('auth');
  };

  // Handle payment and booking creation
  const handleCreateBooking = async () => {
    if (!reservation) {
      console.error('No reservation found when attempting to create booking');
      return;
    }


    // Validate reservation before creating booking
    if (!reservation.reservation_id) {
      console.error('Invalid reservation: missing reservation_id');
      return;
    }

    // Check if reservation has tickets (API uses 'items' field)
    const reservationTickets = reservation.tickets || reservation.items || [];
    if (!reservationTickets || reservationTickets.length === 0) {
      // If no tickets in reservation, we can still proceed with cart items
      // as the reservation was created successfully
      console.warn('No tickets found in reservation response, using cart items as reference');
      if (!cartItems || cartItems.length === 0) {
        console.error('No tickets available for booking - neither in reservation nor cart');
        return;
      }
    }

    // Check if reservation is still valid (not expired)
    const expirationDate = reservation.expires_at || reservation.valid_until;
    if (expirationDate) {
      
      if (isReservationExpired(expirationDate)) {
        console.error('Reservation has expired:', {
          expiresAt: expirationDate,
          minutesAgo: Math.abs(getMinutesUntilExpiration(expirationDate)),
          currentTimeUTC: new Date().toISOString(),
          expired: true
        });
        return;
      }
      
    }

    // Get lead guest email for booking
    const leadGuest = guests.find(g => g.lead_guest);
    const bookingEmail = leadGuest?.contact_email || guests[0]?.contact_email;
    
    if (!bookingEmail) {
      console.error('No booking email available from guests');
      return;
    }


    // Create complete booking data with all required fields
    const bookingData = {
      reservation_id: reservation.reservation_id,
      booking_email: bookingEmail,
      invoice_reference: generateInvoiceReference(),
      booking_reference: generateBookingReference(),
      payment_method: PAYMENT_METHODS.INVOICE // Default to invoice for now
    };


    const newBooking = await createBooking(bookingData);
    if (newBooking) {
      // Navigate directly to confirmation page instead of showing in-checkout confirmation
      onClose(); // Close the checkout modal
      navigate(`/booking/confirmation/${newBooking.booking_id}`);
      
      if (onBookingComplete) {
        onBookingComplete(newBooking.booking_id);
      }
    } else {
      console.error('Booking failed - no booking returned');
    }
  };

  // Render guest data form
  const renderGuestDataStep = () => {
    // Show loading state only if actively loading and no requirements yet
    if (guestDataLoading && !requirements) {
      return (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <h2>Guest Information</h2>
            <p>Loading guest data requirements...</p>
          </div>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      );
    }

    // Always show forms - either with API requirements or essential fields
    const requiredFields = requirements?.fields || ['first_name', 'last_name', 'contact_email', 'date_of_birth'];
    
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2>Guest Information</h2>
          <p>Please provide information for all attendees</p>
        </div>

        <div className={styles.guestForms}>
          {guests.map((guest, index) => (
            <div key={index} className={styles.guestForm}>
              <div className={styles.guestHeader}>
                <User size={20} />
                <h3>Guest {index + 1} {guest.lead_guest && <span className={styles.leadBadge}>Lead Guest</span>}</h3>
              </div>
              
              <div className={styles.formGrid}>
                {/* First Name - Always show */}
                <div className={`${styles.formGroup} ${styles.required}`}>
                  <label>First Name</label>
                  <input
                    type="text"
                    value={guest.first_name}
                    onChange={(e) => handleGuestChange(index, 'first_name', e.target.value)}
                    placeholder="Enter first name"
                    className={fieldErrors[`guest_${index}_first_name`] ? styles.inputError : ''}
                    required
                  />
                  {fieldErrors[`guest_${index}_first_name`] && (
                    <span className={styles.fieldError}>{fieldErrors[`guest_${index}_first_name`]}</span>
                  )}
                </div>

                {/* Last Name - Always show */}
                <div className={`${styles.formGroup} ${styles.required}`}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={guest.last_name}
                    onChange={(e) => handleGuestChange(index, 'last_name', e.target.value)}
                    placeholder="Enter last name"
                    className={fieldErrors[`guest_${index}_last_name`] ? styles.inputError : ''}
                    required
                  />
                  {fieldErrors[`guest_${index}_last_name`] && (
                    <span className={styles.fieldError}>{fieldErrors[`guest_${index}_last_name`]}</span>
                  )}
                </div>

                {/* Email - Always show */}
                <div className={`${styles.formGroup} ${styles.required} ${styles.fullWidth}`}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={guest.contact_email}
                    onChange={(e) => handleGuestChange(index, 'contact_email', e.target.value)}
                    placeholder="Enter email address"
                    className={fieldErrors[`guest_${index}_contact_email`] ? styles.inputError : ''}
                    required
                  />
                  {fieldErrors[`guest_${index}_contact_email`] && (
                    <span className={styles.fieldError}>{fieldErrors[`guest_${index}_contact_email`]}</span>
                  )}
                </div>

                {/* Date of Birth - Always show */}
                <div className={`${styles.formGroup} ${styles.required}`}>
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={guest.date_of_birth}
                    onChange={(e) => handleGuestChange(index, 'date_of_birth', e.target.value)}
                    className={fieldErrors[`guest_${index}_date_of_birth`] ? styles.inputError : ''}
                    required
                  />
                  {fieldErrors[`guest_${index}_date_of_birth`] && (
                    <span className={styles.fieldError}>{fieldErrors[`guest_${index}_date_of_birth`]}</span>
                  )}
                </div>

                {/* Optional fields based on API requirements */}
                {requiredFields.includes('gender') && (
                  <div className={styles.formGroup}>
                    <label>Gender</label>
                    <select
                      value={guest.gender || ''}
                      onChange={(e) => handleGuestChange(index, 'gender', e.target.value as 'male' | 'female' | 'other')}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {fieldErrors[`guest_${index}_gender`] && (
                      <span className={styles.errorText}>{fieldErrors[`guest_${index}_gender`]}</span>
                    )}
                  </div>
                )}

                {requiredFields.includes('country_of_residence') && (
                  <div className={styles.formGroup}>
                    <label>Country of Residence</label>
                    <select
                      value={guest.country_of_residence || ''}
                      onChange={(e) => handleGuestChange(index, 'country_of_residence', e.target.value)}
                    >
                      <option value="">Select country</option>
                      <option value="GBR">United Kingdom</option>
                      <option value="USA">United States</option>
                      <option value="DEU">Germany</option>
                      <option value="FRA">France</option>
                      <option value="ESP">Spain</option>
                      <option value="ITA">Italy</option>
                      <option value="NLD">Netherlands</option>
                    </select>
                    {fieldErrors[`guest_${index}_country_of_residence`] && (
                      <span className={styles.errorText}>{fieldErrors[`guest_${index}_country_of_residence`]}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.stepActions}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Back to Cart
          </button>
          <button 
            className={styles.primaryButton} 
            onClick={handleProceedToReview}
            disabled={guestDataLoading}
          >
            {guestDataLoading ? 'Loading...' : 'Review Order'}
          </button>
        </div>

        {guestDataError && (
          <div className={styles.errorMessage}>
            <p>Note: Using basic form fields due to API unavailability</p>
          </div>
        )}
      </div>
    );
  };

  // Render review step
  const renderReviewStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Review Your Order</h2>
        <p>Please review your booking details before proceeding to payment</p>
      </div>

      {/* Event Details */}
      {eventData && (
        <div className={styles.eventSummary}>
          <h3>{eventData.event_name}</h3>
          <div className={styles.eventDetails}>
            <div className={styles.eventDetail}>
              <Calendar size={16} />
              <span>{formatEventDate(eventData.date_start)}</span>
            </div>
            <div className={styles.eventDetail}>
              <MapPin size={16} />
              <span>{eventData.venue_name}, {eventData.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Summary */}
      <div className={styles.ticketsSummary}>
        <h4>Tickets</h4>
        {cartItems.map((item, index) => (
          <div key={index} className={styles.ticketItem}>
            <div className={styles.ticketInfo}>
              <span className={styles.ticketTitle}>{item.ticket.ticket_title}</span>
              <span className={styles.ticketDetails}>
                {item.ticket.sub_category} • Qty: {item.quantity}
              </span>
            </div>
            <span className={styles.ticketPrice}>
              {formatPrice(item.ticket.face_value * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Guests Summary */}
      <div className={styles.guestsSummary}>
        <h4>Guests</h4>
        {guests.map((guest, index) => (
          <div key={index} className={styles.guestItem}>
            <span>{guest.first_name} {guest.last_name}</span>
            {guest.lead_guest && <span className={styles.leadBadge}>Lead</span>}
          </div>
        ))}
      </div>

      {/* Price Summary */}
      <div className={styles.priceSummary}>
        <div className={styles.priceRow}>
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <span>{formatPrice(orderTotal)}</span>
        </div>
      </div>

      <div className={styles.stepActions}>
        <button className={styles.secondaryButton} onClick={() => setCurrentStep('guest-data')}>
          Back to Guest Info
        </button>
        <button 
          className={styles.primaryButton} 
          onClick={handleCreateReservation}
          disabled={reservationLoading}
        >
          {reservationLoading ? 'Creating Reservation...' : 'Continue'}
        </button>
      </div>

      {reservationError && (
        <div className={styles.errorMessage}>
          {reservationError}
        </div>
      )}
    </div>
  );

  // Render payment step (simplified for demo)
  const renderPaymentStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Payment</h2>
        <p>Reservation created! Total: {formatPrice(orderTotal)}</p>
      </div>

      <div className={styles.paymentForm}>
        <div className={styles.paymentCard}>
          <CreditCard size={24} />
          <div>
            <h4>Payment Details</h4>
            <p>This is a demo payment step. In a real implementation, you would integrate with a payment processor like Stripe, PayPal, or similar.</p>
            <div className={styles.reservationInfo}>
              <p><strong>Reservation ID:</strong> {reservation?.reservation_id}</p>
              <p><strong>Expires:</strong> {reservation?.expires_at ? new Date(reservation.expires_at).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.stepActions}>
        <button className={styles.secondaryButton} onClick={() => setCurrentStep('review')}>
          Back to Review
        </button>
        <button 
          className={styles.primaryButton} 
          onClick={handleCreateBooking}
          disabled={bookingLoading}
        >
          {bookingLoading ? 'Processing Payment...' : 'Complete Booking'}
        </button>
      </div>

      {bookingError && (
        <div className={styles.errorMessage}>
          {bookingError}
        </div>
      )}
    </div>
  );

  // Render authentication step
  const renderAuthStep = () => {
    // If user is already authenticated, skip to payment
    if (isAuthenticated && customer) {
      return (
        <div className={styles.stepContainer}>
          <div className={styles.stepContent}>
            <div className={styles.authSuccess}>
              <div className={styles.authIcon}>
                <Lock size={48} />
              </div>
              <h3>Welcome back, {customer.first_name || customer.email}!</h3>
              <p>You're signed in and ready to complete your booking.</p>
              <div className={styles.customerInfo}>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Name:</strong> {customer.first_name} {customer.last_name}</p>
              </div>
            </div>
          </div>

          <div className={styles.stepFooter}>
            <button 
              className={styles.secondaryButton} 
              onClick={() => setCurrentStep('review')}
            >
              Back to Review
            </button>
            <button 
              className={styles.primaryButton}
              onClick={() => setCurrentStep('payment')}
            >
              Continue to Payment
            </button>
          </div>
        </div>
      );
    }

    // Authentication form handlers
    const handleLogin = async (data: { email: string; password: string }) => {
      try {
        setAuthError('');
        await login(data);
        setCurrentStep('payment');
      } catch (err: any) {
        setAuthError(err.message || 'Login failed. Please try again.');
      }
    };

    const handleRegister = async (data: any) => {
      try {
        setAuthError('');
        await register(data);
        // After successful registration, switch to login form
        setAuthMode('login');
        setAuthError('Registration successful! Please sign in with your credentials.');
      } catch (err: any) {
        setAuthError(err.message || 'Registration failed. Please try again.');
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

    // If user is not authenticated, show authentication forms
    return (
      <div className={styles.stepContainer}>
        <div className={styles.stepContent}>
          <div className={styles.authFormContainer}>
            {authMode === 'login' && (
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
            )}

            {authMode === 'register' && (
              <RegisterForm
                onSubmit={handleRegister}
                onSwitchToLogin={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setForgotPasswordSuccess(false);
                }}
                isLoading={isLoading}
                error={authError}
              />
            )}

            {authMode === 'forgot-password' && (
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
            )}
          </div>
        </div>

        <div className={styles.stepFooter}>
          <button 
            className={styles.secondaryButton} 
            onClick={() => setCurrentStep('review')}
            disabled={isLoading}
          >
            Back to Review
          </button>
        </div>
      </div>
    );
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'guest-data', label: 'Guest Info', icon: User },
      { key: 'review', label: 'Review', icon: Mail },
      { key: 'auth', label: 'Sign In', icon: Lock },
      { key: 'payment', label: 'Payment', icon: CreditCard }
    ];

    const currentStepIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className={styles.stepIndicator}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div 
              key={step.key}
              className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              <div className={styles.stepIcon}>
                <Icon size={16} />
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />
      
      {/* Checkout Panel */}
      <div className={styles.checkoutPanel}>
        <div className={styles.checkoutHeader}>
          <div className={styles.headerContent}>
            <h1>Checkout</h1>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          {renderStepIndicator()}
        </div>

        <div className={styles.checkoutContent}>
          {currentStep === 'guest-data' && renderGuestDataStep()}
          {currentStep === 'review' && renderReviewStep()}
          {currentStep === 'auth' && renderAuthStep()}
          {currentStep === 'payment' && renderPaymentStep()}
        </div>
      </div>
    </>
  );
};

export default CheckoutFlow;
