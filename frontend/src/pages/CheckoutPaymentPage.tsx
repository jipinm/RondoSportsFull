import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../services/customerAuth';
import { useBooking } from '../hooks/useBooking';
import StripeCheckout from '../components/payment/StripeCheckout';

import type { Ticket, Reservation } from '../services/apiRoutes';
import type { GuestFormData } from '../utils/validation';
import styles from './CheckoutPage.module.css';

// Payment details returned from Stripe
interface StripePaymentDetails {
  payment_intent_id: string;
  payment_method_id: string | null;
  customer_id: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  charge_id: string | null;
  full_response: any;
}

interface CartItem {
  ticket: Ticket;
  quantity: number;
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
  guests: GuestFormData[];
  reservation: Reservation;
  guestRequirements?: import('../services/apiRoutes').EventGuestRequirements | null;
  userInfo?: any;
}

const CheckoutPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState;
  
  // Debug: Log the received state
  if (state) {
  }
  
  const [error, setError] = useState<string | null>(null);

  const { customer } = useAuth();
  const { error: bookingError } = useBooking();

  // Calculate total amount
  const calculateTotal = (): number => {
    if (!state?.cartItems) return 0;
    return state.cartItems.reduce((total, item) => {
      return total + (item.ticket.face_value * item.quantity);
    }, 0);
  };

  const orderTotal = calculateTotal();

  // Get currency from first ticket (assuming all tickets have same currency)
  const getCurrency = () => {
    if (!state?.cartItems.length) {
      throw new Error('No cart items found for currency determination');
    }
    const currency = state.cartItems[0].ticket.currency_code;
    if (!currency) {
      throw new Error('Ticket currency is required');
    }
    return currency;
  };

  // NOTE: Booking is now created AFTER payment success, not on page load
  // This prevents duplicate bookings (one pending, one confirmed)

  // Redirect if no state
  useEffect(() => {
    if (!state) {
      navigate('/checkout');
    }
  }, [state, navigate]);

  // Try to recover from session storage if state is missing
  useEffect(() => {
    if (!state) {
      const savedCheckoutState = sessionStorage.getItem('checkoutState');
      if (savedCheckoutState) {
        try {
          JSON.parse(savedCheckoutState);
          // You could potentially restore the state here, but for now just log it
        } catch (error) {
          console.error('Failed to parse saved checkout state:', error);
        }
      }
    }
  }, [state]);

  const handleBackToGuests = () => {
    navigate('/checkout/guest-details', { state });
  };

  const handlePaymentSuccess = async (paymentDetails: StripePaymentDetails) => {
    
    try {
      // Create booking AFTER payment success (not before!)
      const currency = getCurrency();
      
      const bookingPayload = {
        customer_email: customer?.email || state.userInfo?.email || 'guest@example.com',
        customer_first_name: customer?.first_name || state.userInfo?.firstName || 'Guest',
        customer_last_name: customer?.last_name || state.userInfo?.lastName || 'User',
        event_name: state.eventData.event_name,
        event_date: state.eventData.date_start.split('T')[0], // Convert ISO date to YYYY-MM-DD
        venue_name: state.eventData.venue_name,
        sport_type: 'Football',
        tournament_name: state.eventData.tournament_name,
        total_amount: orderTotal,
        currency: currency,
        ticket_count: state.cartItems.reduce((total, item) => total + item.quantity, 0),
        ticket_info: state.cartItems.map(item => ({
          title: item.ticket.ticket_title,
          quantity: item.quantity,
          price: item.ticket.face_value
        })),
        category_name: state.cartItems[0]?.ticket.ticket_title || 'General',
        reservation_id: state.reservation.reservation_id,
        customer_notes: state.guests?.map(g => `${g.first_name} ${g.last_name}`).join(', ') || '',
        payment_method: 'stripe',
        payment_reference: paymentDetails.payment_intent_id,
        payment_intent_id: paymentDetails.payment_intent_id,
        // NEW: Additional Stripe payment fields
        stripe_payment_method_id: paymentDetails.payment_method_id,
        stripe_customer_id: paymentDetails.customer_id,
        stripe_charge_id: paymentDetails.charge_id,
        payment_gateway_response: JSON.stringify(paymentDetails.full_response),
        payment_completed_at: new Date(paymentDetails.created * 1000).toISOString().slice(0, 19).replace('T', ' '),
        // End of Stripe fields
        payment_status: 'completed',
        status: 'confirmed'
      };
      
      
      const response = await fetch(`${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('Booking API Error Response:', errorText);
        throw new Error(`Failed to create booking: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const createdBookingId = result.data.booking_id;
        
        // Prepare state for navigation
        const navigationState = { 
          paymentIntentId: paymentDetails.payment_intent_id, 
          bookingId: createdBookingId,
          bookingReference: result.data.booking_reference,
          apiReservationId: result.data.api_reservation_id,
          totalAmount: orderTotal,
          currency: currency,
          eventData: state.eventData,
          customerEmail: customer?.email || state.userInfo?.email
        };
        
        
        // Navigate to success page with booking details
        navigate('/payment/success', { state: navigationState });
      } else {
        throw new Error(result.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('=== PAYMENT SUCCESS - ERROR ===');
      console.error('Error creating booking after payment:', error);
      setError('Payment successful but booking creation failed. Please contact support.');
      
      // Still navigate to success page so user knows payment worked
      const fallbackState = { 
        paymentIntentId: paymentDetails.payment_intent_id,
        totalAmount: orderTotal,
        currency: getCurrency(),
        eventData: state.eventData,
        error: 'Booking creation failed - contact support'
      };
      
      
      navigate('/payment/success', { state: fallbackState });
    }
    
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  const handlePaymentCancel = () => {
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format price for display
  const formatPrice = (amount: number): string => {
    const currency = getCurrency();
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Render order summary (consistent with other checkout pages)
  const renderOrderSummary = () => (
    <div className={styles.orderSummary}>
      <h3>Order overview</h3>
      <div className={styles.eventInfo}>
        <h4>{state.eventData.event_name}</h4>
        <div className={styles.eventDetails}>
          <p>📅 {formatDate(state.eventData.date_start)}</p>
          <p>📍 {state.eventData.venue_name}, {state.eventData.city}</p>
        </div>
      </div>

      <div className={styles.ticketSummary}>
        {state.cartItems.map((item, index) => (
          <div key={index} className={styles.ticketItem}>
            <div className={styles.ticketDetails}>
              <span className={styles.ticketName}>{item.ticket.ticket_title}</span>
              <span className={styles.ticketQuantity}>Qty: {item.quantity}</span>
            </div>
            <span className={styles.ticketPrice}>
              {formatPrice(item.ticket.face_value * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.orderTotals}>
        <div className={styles.totalRow}>
          <span>Order total</span>
          <span>{formatPrice(orderTotal)}</span>
        </div>
      </div>

      {/* Guest Information */}
      {state.guests && state.guests.length > 0 && (
        <div className={styles.guestInfo}>
          <h4>Guests ({state.guests.length})</h4>
          {state.guests.map((guest, index) => (
            <div key={index} className={styles.guestSummary}>
              <span>{guest.first_name} {guest.last_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!state || !state.reservation) {
    
    return (
      <div className={styles.checkoutPage}>
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.leftColumn}>
              <div className={styles.errorMessage}>
                <h2>Invalid Access</h2>
                <p>Please start the booking process from the beginning.</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => navigate('/checkout')}
                >
                  Start Booking
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Left column - Payment content */}
          <div className={styles.leftColumn}>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepItem} ${styles.completed}`}>
                <div className={styles.stepIcon}>
                  <User size={16} />
                </div>
                <span className={styles.stepLabel}>Sign In</span>
              </div>
              <div className={`${styles.stepItem} ${styles.completed}`}>
                <div className={styles.stepIcon}>
                  <Mail size={16} />
                </div>
                <span className={styles.stepLabel}>Guest Info</span>
              </div>
              <div className={`${styles.stepItem} ${styles.active}`}>
                <div className={styles.stepIcon}>
                  <Lock size={16} />
                </div>
                <span className={styles.stepLabel}>Payment</span>
              </div>
            </div>

            <div className={styles.stepContent}>
              <h2>Payment Details</h2>
              <p>Choose your payment method to complete your booking.</p>
              
              <div className={styles.paymentSection}>
                <StripeCheckout
                  bookingData={{
                    totalAmount: orderTotal,
                    customerEmail: customer?.email || state.userInfo?.email || (state.guests?.[0]?.contact_email),
                    customerName: state.guests?.[0] ? `${state.guests[0].first_name} ${state.guests[0].last_name}`.trim() : (customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : ''),
                    customerPhone: state.guests?.[0]?.contact_phone,
                    eventName: state.eventData.event_name,
                    eventDate: formatDate(state.eventData.date_start),
                    currency: getCurrency()
                  }}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handlePaymentCancel}
                />

                {(bookingError || error) && (
                  <div className={styles.errorMessage}>
                    {error || bookingError}
                  </div>
                )}
              </div>

              <div className={styles.stepActions}>
                <button 
                  className={styles.secondaryButton}
                  onClick={handleBackToGuests}
                >
                  Back to Guest Info
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

export default CheckoutPaymentPage;