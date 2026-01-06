import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './PaymentCancel.module.css';

const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const bookingId = searchParams.get('booking_id');

  const handleRetryPayment = () => {
    if (bookingId) {
      // Instead of going directly to payment, restart the booking flow
      // The booking ID will help recover the state if needed
      navigate('/checkout', { state: { bookingId } });
    } else {
      navigate('/checkout');
    }
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleViewEvents = () => {
    navigate('/events');
  };

  return (
    <div className={styles.container}>
      <div className={styles.cancelCard}>
        <div className={styles.cancelIcon}>
          <div className={styles.crossmark}>✕</div>
        </div>
        
        <h1>Payment Cancelled</h1>
        <p className={styles.subtitle}>
          Your payment was cancelled and no charges have been made to your card.
        </p>

        <div className={styles.infoBox}>
          <h3>What happened?</h3>
          <p>
            You chose to cancel the payment process. Your booking reservation is still held 
            temporarily, but it will be automatically released if payment is not completed within 
            the next 15 minutes.
          </p>
        </div>

        {bookingId && (
          <div className={styles.bookingInfo}>
            <p>
              <strong>Booking ID:</strong> #{bookingId}
            </p>
            <p className={styles.warning}>
              ⏰ This reservation will expire soon. Complete payment to secure your booking.
            </p>
          </div>
        )}

        <div className={styles.options}>
          <h3>What would you like to do?</h3>
          
          <div className={styles.optionGrid}>
            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>💳</div>
              <h4>Complete Payment</h4>
              <p>Return to payment and complete your booking</p>
              <button onClick={handleRetryPayment} className={styles.primaryButton}>
                Retry Payment
              </button>
            </div>
            
            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>🎟️</div>
              <h4>Browse Events</h4>
              <p>Explore other available events</p>
              <button onClick={handleViewEvents} className={styles.secondaryButton}>
                View Events
              </button>
            </div>
            
            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>🏠</div>
              <h4>Return Home</h4>
              <p>Go back to the main page</p>
              <button onClick={handleReturnHome} className={styles.tertiaryButton}>
                Home Page
              </button>
            </div>
          </div>
        </div>

        <div className={styles.helpSection}>
          <h4>Need Help?</h4>
          <p>
            If you're experiencing issues with payment or have questions about your booking, 
            please <a href="/contact">contact our support team</a> for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;