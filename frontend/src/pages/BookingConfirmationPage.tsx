import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './BookingConfirmationPage.module.css';
import { apiClient, API_ENDPOINTS, type Booking } from '../services/apiRoutes';

const BookingConfirmationPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        setError(null);


        const response = await apiClient.get(`${API_ENDPOINTS.BOOKINGS}/${bookingId}`);
        
        setBooking(response.data);
      } catch (err: any) {
        console.error('Error fetching booking details:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.status,
          response: err.response
        });
        setError(err?.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <div className={styles.confirmationPage}>
        <div className={`${styles.container} ${styles.fullWidth}`}>
          <div className={styles.mainContent}>
            <div className={styles.loadingState}>
              <p>Loading booking details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.confirmationPage}>
        <div className={`${styles.container} ${styles.fullWidth}`}>
          <div className={styles.mainContent}>
            <div className={styles.errorState}>
              <h2>Unable to Load Booking</h2>
              <p>{error}</p>
              <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.confirmationPage}>
        <div className={`${styles.container} ${styles.fullWidth}`}>
          <div className={styles.mainContent}>
            <div className={styles.errorState}>
              <h2>Booking Not Found</h2>
              <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.confirmationPage}>
      <div className={`${styles.container} ${styles.fullWidth}`}>
        <div className={styles.mainContent}>
          <div className={styles.confirmationCard}>
            <h1>🎉 Booking Confirmed!</h1>
            <div className={styles.confirmationDetails}>
              <h2>Booking Details</h2>
              <p><strong>Booking ID:</strong> {booking.booking_id}</p>
              <p><strong>Confirmation Code:</strong> {booking.confirmation_code}</p>
              <p><strong>Status:</strong> {booking.status}</p>
              <p><strong>Payment Status:</strong> {booking.payment_status}</p>
              <p><strong>Total Price:</strong> £{(booking.total_price / 100).toFixed(2)}</p>
              <p><strong>Reservation ID:</strong> {booking.reservation_id}</p>
            </div>
            
            <div className={styles.nextSteps}>
              <h3>What's Next?</h3>
              <ul>
                <li>You will receive a confirmation email shortly</li>
                <li>Please arrive at the venue 30 minutes before the event</li>
                <li>Bring a valid ID that matches the booking details</li>
                <li>Your tickets will be available at the venue entrance</li>
              </ul>
            </div>
            
            <div className={styles.actions}>
              <button onClick={() => navigate('/')} className={styles.primaryButton}>
                Back to Home
              </button>
              <button onClick={() => window.print()} className={styles.secondaryButton}>
                Print Confirmation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
