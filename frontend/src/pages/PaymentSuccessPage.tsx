import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './PaymentSuccess.module.css';

interface PaymentData {
  payment_intent_id?: string;
  session_id?: string;
  booking_id: number;
  amount_total?: number;
  total_amount?: number;
  currency?: string;
  customer_email?: string;
  event_name?: string;
  payment_status?: string;
  booking_reference?: string;
  api_reservation_id?: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const locationState = location.state as any;

  useEffect(() => {
    
    // Check if we have payment data from location state (Payment Intent flow)
    if (locationState?.paymentIntentId && locationState?.bookingId) {
      
      // Fetch full booking details to get booking_reference and api_reservation_id
      const fetchBookingDetails = async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings/${locationState.bookingId}`
          );


          if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
              const paymentData = {
                payment_intent_id: locationState.paymentIntentId,
                booking_id: locationState.bookingId,
                total_amount: locationState.totalAmount || 0,
                currency: locationState.currency || 'USD',
                event_name: locationState.eventData?.event_name || 'Event',
                payment_status: 'succeeded',
                booking_reference: result.data.booking_reference,
                api_reservation_id: result.data.api_reservation_id,
                customer_email: locationState.customerEmail
              };
              
              setPaymentData(paymentData);
              setLoading(false);
              return;
            }
          }
          
          console.warn('Booking fetch failed, using fallback data from location state');
          // Fallback to basic payment data if booking details fetch fails
          const fallbackData = {
            payment_intent_id: locationState.paymentIntentId,
            booking_id: locationState.bookingId,
            total_amount: locationState.totalAmount || 0,
            currency: locationState.currency || 'USD',
            event_name: locationState.eventData?.event_name || 'Event',
            payment_status: 'succeeded',
            booking_reference: locationState.bookingReference,
            api_reservation_id: locationState.apiReservationId,
            customer_email: locationState.customerEmail
          };
          
          setPaymentData(fallbackData);
        } catch (error) {
          console.error('Error fetching booking details:', error);
          // Use basic payment data as fallback
          const errorFallbackData = {
            payment_intent_id: locationState.paymentIntentId,
            booking_id: locationState.bookingId,
            total_amount: locationState.totalAmount || 0,
            currency: locationState.currency || 'USD',
            event_name: locationState.eventData?.event_name || 'Event',
            payment_status: 'succeeded',
            booking_reference: locationState.bookingReference,
            api_reservation_id: locationState.apiReservationId,
            customer_email: locationState.customerEmail
          };
          
          setPaymentData(errorFallbackData);
        }
        setLoading(false);
      };

      fetchBookingDetails();
      return;
    }

    // Fallback to session ID flow (Stripe Checkout)
    if (!sessionId) {
      console.error('No payment information found - no locationState and no sessionId');
      console.error('Expected locationState to have: paymentIntentId, bookingId');
      console.error('Or expected URL to have: ?session_id=xxx');
      setError('No payment information found');
      setLoading(false);
      return;
    }


    const fetchSessionData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/payments/session/${sessionId}`
        );

        if (!response.ok) {
          throw new Error('Failed to retrieve session data');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to retrieve session data');
        }

        // Fetch additional booking details if we have a booking_id
        let bookingReference = undefined;
        let apiReservationId = undefined;
        
        if (result.data.booking_id) {
          try {
            const bookingResponse = await fetch(
              `${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings/${result.data.booking_id}`
            );
            
            if (bookingResponse.ok) {
              const bookingResult = await bookingResponse.json();
              if (bookingResult.success) {
                bookingReference = bookingResult.data.booking_reference;
                apiReservationId = bookingResult.data.api_reservation_id;
              }
            }
          } catch (bookingError) {
            console.error('Error fetching additional booking details:', bookingError);
          }
        }

        setPaymentData({
          session_id: result.data.session_id,
          booking_id: result.data.booking_id,
          amount_total: result.data.amount_total,
          currency: result.data.currency,
          customer_email: result.data.customer_email,
          payment_status: result.data.payment_status,
          booking_reference: bookingReference,
          api_reservation_id: apiReservationId
        });
      } catch (error: any) {
        console.error('Error fetching session data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, locationState]);

  const formatAmount = (amount: number, currency: string = 'USD', isFromSession: boolean = false): string => {
    // For session data (Stripe Checkout), amounts are in cents and need to be divided by 100
    // For payment intent data (passed from location state), amounts are already in the correct format
    const actualAmount = isFromSession ? amount / 100 : amount;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(actualAmount);
  };

  const handleContinue = () => {
    navigate('/bookings');
  };

  const handleNewBooking = () => {
    navigate('/events');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <h2>Confirming your payment...</h2>
          <p>Please wait while we process your booking confirmation.</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>❌</div>
          <h2>Payment Confirmation Error</h2>
          <p>{error || 'Unable to confirm payment status'}</p>
          <div className={styles.buttonGroup}>
            <button onClick={() => navigate('/')} className={styles.homeButton}>
              Return Home
            </button>
            <button onClick={() => navigate('/contact')} className={styles.supportButton}>
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>
          <div className={styles.checkmark}>✓</div>
        </div>
        
        <h1>Payment Successful!</h1>
        <p className={styles.subtitle}>
          Your booking has been confirmed and you will receive a confirmation email shortly.
        </p>

        <div className={styles.paymentDetails}>
          <div className={styles.detailRow}>
            <span>Booking ID:</span>
            <span className={styles.bookingId}>#{paymentData.booking_id}</span>
          </div>
          {paymentData.booking_reference && (
            <div className={styles.detailRow}>
              <span>Booking Reference ID:</span>
              <span className={styles.bookingReference}>{paymentData.booking_reference}</span>
            </div>
          )}
          {paymentData.api_reservation_id && (
            <div className={styles.detailRow}>
              <span>Reservation ID:</span>
              <span className={styles.reservationId}>{paymentData.api_reservation_id}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span>Amount Paid:</span>
            <span className={styles.amount}>
              {formatAmount(
                paymentData.amount_total || paymentData.total_amount || 0, 
                paymentData.currency || 'USD',
                !!paymentData.session_id // true if from session (amounts in cents), false if from payment intent (actual amounts)
              )}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span>Payment Status:</span>
            <span className={styles.status}>
              {paymentData.payment_status === 'paid' || paymentData.payment_status === 'succeeded' ? 'Completed' : 'Pending'}
            </span>
          </div>
          {paymentData.event_name && (
            <div className={styles.detailRow}>
              <span>Event:</span>
              <span>{paymentData.event_name}</span>
            </div>
          )}
          {paymentData.customer_email && (
            <div className={styles.detailRow}>
              <span>Confirmation sent to:</span>
              <span className={styles.email}>{paymentData.customer_email}</span>
            </div>
          )}
        </div>

        <div className={styles.nextSteps}>
          <h3>What's Next?</h3>
          <ul>
            <li>Check your email for booking confirmation details</li>
            <li>Save your booking ID: <strong>#{paymentData.booking_id}</strong>
              {paymentData.booking_reference && (
                <span> (Reference: <strong>{paymentData.booking_reference}</strong>)</span>
              )}
            </li>
            <li>Arrive at the venue 30 minutes before the event starts</li>
            <li>Bring a valid ID for verification</li>
          </ul>
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={handleContinue} className={styles.primaryButton}>
            View My Bookings
          </button>
          <button onClick={handleNewBooking} className={styles.secondaryButton}>
            Book Another Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;