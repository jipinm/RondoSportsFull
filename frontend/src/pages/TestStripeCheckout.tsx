import React, { useState, useEffect } from 'react';
import StripeCheckout, { type StripePaymentDetails } from '../components/payment/StripeCheckout';

const TestStripeCheckout: React.FC = () => {
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a test booking when component mounts
  useEffect(() => {
    const createTestBooking = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_email: 'test@example.com',
            customer_name: 'Test User',
            event_name: 'Test Championship Final',
            event_date: '2024-01-20 19:00:00',
            venue_name: 'Test Stadium',
            sport_type: 'Football',
            tournament_name: 'Test Championship',
            total_amount: 150.00,
            currency: 'AED',
            ticket_count: 2,
            category_name: 'VIP',
            customer_notes: 'Test booking for Stripe payment testing'
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create test booking: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          setBookingId(result.data.booking_id);
          console.log('Test booking created:', result.data);
        } else {
          throw new Error(result.error || 'Failed to create test booking');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to create test booking:', err);
      } finally {
        setLoading(false);
      }
    };

    createTestBooking();
  }, []);

  const handlePaymentSuccess = (paymentDetails: StripePaymentDetails) => {
    console.log('Payment successful:', paymentDetails);
    alert(`Payment successful! Payment Intent ID: ${paymentDetails.payment_intent_id}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Payment error: ${error}`);
  };

  const handlePaymentCancel = () => {
    console.log('Payment cancelled by user');
    alert('Payment cancelled');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Stripe Checkout Test</h1>
        <p>Creating test booking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Stripe Checkout Test</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Stripe Checkout Test</h1>
        <p>No booking ID available</p>
      </div>
    );
  }

  // Test data for the Stripe checkout
  const testBookingData = {
    bookingId: bookingId,
    totalAmount: 150.00, // AED 150.00
    customerEmail: 'test@example.com',
    eventName: 'Test Championship Final',
    eventDate: 'Saturday, January 20, 2024'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Stripe Checkout Test</h1>
      <p>This is a test page to verify that the Stripe iframe loads correctly.</p>
      <p><strong>Test Booking:</strong> ID = {bookingId} (Real booking in database)</p>
      
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <StripeCheckout
          bookingData={testBookingData}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />
      </div>
    </div>
  );
};

export default TestStripeCheckout;