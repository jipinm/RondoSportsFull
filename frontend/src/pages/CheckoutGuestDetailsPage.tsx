import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock, ChefHat } from 'lucide-react';
import { useAuth } from '../services/customerAuth';
import type { CustomerProfile } from '../services/customerAuth';
import { useReservation } from '../hooks/useReservation';
import type { Guest } from '../services/apiRoutes';
import CountrySelect from '../components/CountrySelect';
import { 
  validateAllGuests, 
  mapUserDetailsToLeadGuest,
  type GuestFormData,
  type ValidationError,
  type UserDetailsFormData
} from '../utils/validation';
import type { Ticket } from '../services/apiRoutes';
import styles from './CheckoutPage.module.css';

// Selected hospitality type
interface SelectedHospitality {
  id: number;
  hospitality_id: number;
  name: string;
  price_usd: number;
}

interface CartItem {
  ticket: Ticket;
  quantity: number;
  finalPriceUSD?: number;
  markupAmount?: number;
  selectedHospitalities?: SelectedHospitality[];
  hospitalityTotal?: number;
  totalPricePerTicket?: number;
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
  userInfo?: any;
  markupsData?: Record<string, any>;
  selectedCurrencyCode?: string;
}

const CheckoutGuestDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState;
  
  const [guests, setGuests] = useState<GuestFormData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [, setFormTouched] = useState<Record<string, boolean>>({});
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const { customer, isAuthenticated, getProfile } = useAuth();
  const { createReservation, addGuestData, loading: reservationLoading, error: reservationError } = useReservation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/checkout/login', { 
        state: state ? { cartItems: state.cartItems, eventData: state.eventData, guestRequirements: state.guestRequirements } : null 
      });
      return;
    }
  }, [isAuthenticated, customer, navigate, state]);

  // Redirect if no cart items
  useEffect(() => {
    if (!state || !state.cartItems || state.cartItems.length === 0) {
      navigate('/', { replace: true });
      return;
    }
  }, [state, navigate]);

  // Load customer profile
  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated && customer) {
        try {
          setProfileLoading(true);
          const profile = await getProfile();
          setCustomerProfile(profile);
        } catch (error) {
          console.error('Failed to load customer profile:', error);
        } finally {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();
  }, [isAuthenticated, customer, getProfile]);

  // Initialize guests when component mounts and profile is loaded
  useEffect(() => {
    if (state?.cartItems && customer && customerProfile && !profileLoading) {
      const totalTickets = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
      initializeGuests(totalTickets);
    }
  }, [state?.cartItems, customer, customerProfile, profileLoading]);

  // Early return if no state, not authenticated, or profile still loading
  if (!state || !state.cartItems || !isAuthenticated || !customer || profileLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading guest details...</p>
          </div>
        </div>
      </div>
    );
  }

  const { cartItems, eventData } = state;

  // Initialize guests array with default values and pre-fill lead guest
  const initializeGuests = (totalTickets: number) => {
    const newGuests: GuestFormData[] = [];
    
    // Get stored user details from account creation or use customer profile data
    const storedUserDetails = sessionStorage.getItem('userDetails');
    let userDetails: UserDetailsFormData | null = null;
    
    if (storedUserDetails) {
      userDetails = JSON.parse(storedUserDetails);
    } else if (customerProfile) {
      // Map customer profile data to user details format
      userDetails = {
        firstName: customerProfile.first_name || '',
        lastName: customerProfile.last_name || '',
        email: customerProfile.email || '',
        street: customerProfile.street || '',
        houseNumber: customerProfile.house_number || '',
        zipCode: customerProfile.zipcode || '',
        city: customerProfile.city || '',
        country: customerProfile.country_code || '',
        phone: customerProfile.phone || ''
      };
    }
    
    for (let i = 0; i < totalTickets; i++) {
      if (i === 0 && userDetails) {
        // Pre-fill lead guest with user details
        const leadGuest = mapUserDetailsToLeadGuest(userDetails, {
          contact_email: customer.email
        });
        newGuests.push(leadGuest);
      } else {
        // Empty guests for additional tickets
        newGuests.push({
          first_name: '',
          last_name: '',
          contact_email: '',
          date_of_birth: '',
          country_of_residence: '',
          gender: undefined,
          passport_number: '',
          street_name: '',
          city: '',
          zip: '',
          contact_phone: ''
        });
      }
    }
    
    setGuests(newGuests);
    
    // Clear stored user details after use
    sessionStorage.removeItem('userDetails');
  };

  // Calculate totals (including hospitalities)
  const checkoutCurrency = state?.selectedCurrencyCode || 'USD';
  const subtotal = cartItems.reduce((total, item) => {
    // Use totalPricePerTicket if available (includes ticket + hospitalities)
    const itemPrice = item.totalPricePerTicket || item.finalPriceUSD || item.ticket.face_value;
    return total + (itemPrice * item.quantity);
  }, 0);

  const orderTotal = subtotal;

  const formatPrice = (amount: number) => {
    return `${checkoutCurrency} ${amount.toFixed(2)}`;
  };

  // Form handlers
  const handleGuestChange = (guestIndex: number, field: keyof GuestFormData, value: string) => {
    setGuests(prev => prev.map((guest, index) => 
      index === guestIndex ? { ...guest, [field]: value } : guest
    ));
    setFormTouched(prev => ({ ...prev, [`guest_${guestIndex}_${field}`]: true }));
  };

  const validateCurrentStep = () => {
    const guestValidation = validateAllGuests(guests);
    setValidationErrors(guestValidation.errors);
    return guestValidation.isValid;
  };

  const handleContinueToPayment = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (!state?.cartItems || !customer) {
      console.error('Missing required data for reservation creation');
      return;
    }

    try {
      // Get lead guest information
      const leadGuest = guests[0];
      if (!leadGuest) {
        console.error('No lead guest found');
        return;
      }

      // Create reservation with XS2Event API format (simplified - guest data comes later)
      const reservationData = {
        items: state.cartItems.map(item => ({
          ticket_id: item.ticket.ticket_id,
          quantity: item.quantity,
          net_rate: item.ticket.net_rate,
          currency_code: item.ticket.currency_code || 'GBP' // Required by XS2Event API
        }))
      };

      
      const reservation = await createReservation(reservationData);
      
      if (!reservation) {
        console.error('Failed to create reservation');
        return;
      }


      // Convert guests to Guest interface format
      const guestData: Guest[] = guests.map((guest, index) => ({
        first_name: guest.first_name,
        last_name: guest.last_name,
        contact_email: guest.contact_email,
        date_of_birth: guest.date_of_birth,
        gender: guest.gender,
        country_of_residence: guest.country_of_residence,
        lead_guest: index === 0
      }));

      // Add guest data to the reservation
      const guestDataSuccess = await addGuestData(reservation.reservation_id, guestData);
      
      if (!guestDataSuccess) {
        console.error('Failed to add guest data to reservation');
        return;
      }


      // Save state to session storage for recovery
      const stateToSave = {
        ...state,
        guests: guests,
        reservation: reservation,
        userInfo: customer
      };
      sessionStorage.setItem('checkoutState', JSON.stringify(stateToSave));

      // Navigate to payment page with reservation included

      navigate('/checkout/payment', {
        state: stateToSave
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
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
          const itemPrice = item.totalPricePerTicket || item.finalPriceUSD || item.ticket.face_value;
          return (
            <div key={index} className={styles.ticketItem}>
              <div className={styles.ticketDetails}>
                <span className={styles.ticketName}>{item.ticket.ticket_title}</span>
                <span className={styles.ticketQuantity}>Qty: {item.quantity}</span>
                {/* Display selected hospitalities */}
                {item.selectedHospitalities && item.selectedHospitalities.length > 0 && (
                  <div className={styles.hospitalityList}>
                    {item.selectedHospitalities.map(h => (
                      <div key={h.hospitality_id} className={styles.hospitalityItem}>
                        <ChefHat size={12} />
                        <span>{h.name}</span>
                        <span>+{formatPrice(h.price_usd)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.ticketPrice}>
                {formatPrice(itemPrice * item.quantity)}
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

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Left column - Form content */}
          <div className={styles.leftColumn}>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepItem} ${styles.completed}`}>
                <div className={styles.stepIcon}>
                  <User size={16} />
                </div>
                <span className={styles.stepLabel}>Sign In</span>
              </div>
              <div className={`${styles.stepItem} ${styles.active}`}>
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

            <div className={styles.stepContent}>
              <h2>Guest Information</h2>
              <p>Enter the details for all guests attending the event.</p>
              
              <div className={styles.welcomeMessage}>
                <p>Welcome back, <strong>{customer.first_name || customer.email}</strong>!</p>
                <p>Lead guest information has been pre-filled with your account details.</p>
              </div>

              <div className={styles.guestsContainer}>
                {guests.map((guest, index) => (
                  <div key={index} className={styles.guestSection}>
                    <h4>Guest {index + 1} {index === 0 && '(Lead Guest)'}</h4>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}FirstName`}>First name *</label>
                        <input
                          type="text"
                          id={`guest${index}FirstName`}
                          className={styles.formInput}
                          value={guest.first_name}
                          onChange={(e) => handleGuestChange(index, 'first_name', e.target.value)}
                          placeholder="Enter first name"
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_first_name`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_first_name`)?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}LastName`}>Last name *</label>
                        <input
                          type="text"
                          id={`guest${index}LastName`}
                          className={styles.formInput}
                          value={guest.last_name}
                          onChange={(e) => handleGuestChange(index, 'last_name', e.target.value)}
                          placeholder="Enter last name"
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_last_name`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_last_name`)?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {index === 0 && (
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}Email`}>Email address *</label>
                        <input
                          type="email"
                          id={`guest${index}Email`}
                          className={styles.formInput}
                          value={guest.contact_email}
                          onChange={(e) => handleGuestChange(index, 'contact_email', e.target.value)}
                          placeholder="Enter email address"
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_contact_email`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_contact_email`)?.message}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}Phone`}>Phone number</label>
                        <input
                          type="tel"
                          id={`guest${index}Phone`}
                          className={styles.formInput}
                          value={guest.contact_phone || ''}
                          onChange={(e) => handleGuestChange(index, 'contact_phone', e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}DateOfBirth`}>Date of birth</label>
                        <input
                          type="date"
                          id={`guest${index}DateOfBirth`}
                          className={styles.formInput}
                          value={guest.date_of_birth}
                          onChange={(e) => handleGuestChange(index, 'date_of_birth', e.target.value)}
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_date_of_birth`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_date_of_birth`)?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}CountryOfResidence`}>Country of residence *</label>
                        <CountrySelect
                          value={guest.country_of_residence}
                          onChange={(value) => handleGuestChange(index, 'country_of_residence', value)}
                          placeholder="Select country..."
                          className={styles.formSelect}
                          error={validationErrors.find(e => e.field === `guest_${index}_country_of_residence`)?.message}
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_country_of_residence`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_country_of_residence`)?.message}
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor={`guest${index}PassportNumber`}>Passport number</label>
                        <input
                          type="text"
                          id={`guest${index}PassportNumber`}
                          className={styles.formInput}
                          value={guest.passport_number || ''}
                          onChange={(e) => handleGuestChange(index, 'passport_number', e.target.value)}
                          placeholder="Enter passport number"
                        />
                        {validationErrors.find(e => e.field === `guest_${index}_passport_number`) && (
                          <div className={styles.errorMessage}>
                            {validationErrors.find(e => e.field === `guest_${index}_passport_number`)?.message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {reservationError && (
                <div className={styles.errorMessage}>
                  Error creating reservation: {reservationError}
                </div>
              )}
              
              <div className={styles.stepActions}>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => navigate('/checkout/login', { state })}
                  disabled={reservationLoading}
                >
                  Back to Sign In
                </button>
                <button 
                  className={styles.primaryButton}
                  onClick={handleContinueToPayment}
                  disabled={reservationLoading}
                >
                  {reservationLoading ? (
                    <>
                      <div className={styles.spinner}></div>
                      Creating Reservation...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </div>
            </div>
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

export default CheckoutGuestDetailsPage;