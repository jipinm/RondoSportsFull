import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../services/customerAuth';
import { useBooking } from '../hooks/useBooking';
import StripeCheckout, { type StripePaymentDetails } from '../components/payment/StripeCheckout';

import type { Ticket, Reservation } from '../services/apiRoutes';
import type { GuestFormData } from '../utils/validation';
import styles from './CheckoutPage.module.css';

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
  
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const { customer } = useAuth();
  const { loading: bookingLoading, error: bookingError, createBooking } = useBooking();

  // Calculate total amount
  const calculateTotal = (): number => {
    if (!state?.cartItems) return 0;
    return state.cartItems.reduce((total, item) => {
      return total + (item.ticket.face_value * item.quantity);
    }, 0);
  };

  const orderTotal = calculateTotal();

  // Redirect if no state
  useEffect(() => {
    if (!state) {
      navigate('/checkout');
    }
  }, [state, navigate]);

  const handleBackToReservation = () => {
    navigate('/checkout/reservation', { state });
  };

  const handleProceedToPayment = async () => {
    if (!state) return;

    try {
      // Create booking first
      const bookingResult = await createBooking({
        reservation_id: state.reservation.reservation_id,
        booking_email: customer?.email || 'guest@example.com',
        invoice_reference: `INV-${Date.now()}`,
        booking_reference: `BOOK-${Date.now()}`,
        payment_method: 'stripe'
      });

      if (bookingResult?.booking_id) {
        setBookingId(parseInt(bookingResult.booking_id));
        setShowStripePayment(true);
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  const handlePaymentSuccess = (paymentDetails: StripePaymentDetails) => {
    navigate('/payment/success', { 
      state: { 
        paymentIntent: paymentDetails.payment_intent_id,
        paymentDetails: paymentDetails,
        bookingId,
        eventData: state.eventData 
      }
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setShowStripePayment(false);
  };

  const handlePaymentCancel = () => {
    setShowStripePayment(false);
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
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };

  if (!state) {
    return <div>Loading...</div>;
  }

  if (showStripePayment && bookingId) {
    return (
      <div className={styles.checkoutContainer}>
        <div className={styles.paymentContainer}>
          <StripeCheckout
            bookingData={{
              bookingId,
              totalAmount: orderTotal,
              customerEmail: customer?.email,
              eventName: state.eventData.event_name,
              eventDate: formatDate(state.eventData.date_start)
            }}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutContainer}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.header}>
          <button 
            onClick={handleBackToReservation}
            className={styles.backButton}
            aria-label="Back to reservation"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1>Payment Details</h1>
        </div>

        <div className={styles.checkoutGrid}>
          {/* Left Column - Payment Options */}
          <div className={styles.mainContent}>
            <div className={styles.section}>
              <h2>
                <CreditCard size={24} />
                Payment Method
              </h2>
              
              <div className={styles.paymentMethodCard}>
                <div className={styles.methodInfo}>
                  <div className={styles.methodIcon}>💳</div>
                  <div className={styles.methodDetails}>
                    <h3>Secure Card Payment</h3>
                    <p>Pay securely with your credit or debit card via Stripe</p>
                    <div className={styles.securityBadges}>
                      <span className={styles.badge}>🔒 SSL Secured</span>
                      <span className={styles.badge}>✓ PCI Compliant</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                className={styles.proceedButton}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <>
                    <div className={styles.spinner}></div>
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Proceed to Payment
                  </>
                )}
              </button>

              {bookingError && (
                <div className={styles.errorMessage}>
                  {bookingError}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className={styles.sidebar}>
            <div className={styles.orderSummary}>
              <h3>Order Summary</h3>
              
              {/* Event Information */}
              <div className={styles.eventInfo}>
                <h4>{state.eventData.event_name}</h4>
                <p className={styles.tournamentName}>{state.eventData.tournament_name}</p>
                <p className={styles.eventDetails}>
                  📅 {formatDate(state.eventData.date_start)}
                </p>
                <p className={styles.eventDetails}>
                  📍 {state.eventData.venue_name}, {state.eventData.city}
                </p>
              </div>

              {/* Tickets */}
              <div className={styles.ticketsList}>
                <h5>Tickets</h5>
                {state.cartItems.map((item, index) => (
                  <div key={index} className={styles.ticketItem}>
                    <div className={styles.ticketDetails}>
                      <span className={styles.ticketName}>{item.ticket.category_name}</span>
                      <span className={styles.ticketQuantity}>× {item.quantity}</span>
                    </div>
                    <span className={styles.ticketPrice}>
                      {formatPrice(item.ticket.face_value * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className={styles.orderTotal}>
                <div className={styles.totalRow}>
                  <span>Total Amount</span>
                  <span className={styles.totalAmount}>
                    {formatPrice(orderTotal)}
                  </span>
                </div>
              </div>

              {/* Guest Information */}
              {state.guests && state.guests.length > 0 && (
                <div className={styles.guestInfo}>
                  <h5>Guests ({state.guests.length})</h5>
                  {state.guests.map((guest, index) => (
                    <div key={index} className={styles.guestItem}>
                      <span>{guest.first_name} {guest.last_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Information */}
            <div className={styles.securityInfo}>
              <h4>🔒 Secure Payment</h4>
              <p>Your payment information is encrypted and secure. We never store your card details.</p>
              <ul>
                <li>256-bit SSL encryption</li>
                <li>PCI DSS compliant</li>
                <li>Stripe secure processing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPaymentPage;