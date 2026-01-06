import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import styles from './StripeCheckout.module.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface BookingData {
  bookingId?: number; // Optional - booking created after payment success
  totalAmount: number;
  customerEmail?: string;
  customerName?: string; // Combined first_name + last_name
  customerPhone?: string;
  eventName: string;
  eventDate: string;
  currency?: string;
}

// Payment details returned from Stripe
export interface StripePaymentDetails {
  payment_intent_id: string;
  payment_method_id: string | null;
  customer_id: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  charge_id: string | null;
  full_response: any;  // Full Payment Intent object for audit
}

interface StripeCheckoutProps {
  bookingData: BookingData;
  onSuccess: (paymentDetails: StripePaymentDetails) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface CheckoutFormProps {
  bookingData: BookingData;
  onSuccess: (paymentDetails: StripePaymentDetails) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  bookingData,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const formatPrice = (amount: number): string => {
    if (!bookingData.currency) {
      throw new Error('Booking currency is required for payment');
    }
    const currency = bookingData.currency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          receipt_email: bookingData.customerEmail,
        },
        redirect: 'if_required'
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Mark payment as succeeded to prevent button re-enabling
        setPaymentSucceeded(true);
        
        // Cast to any to access all Stripe PaymentIntent properties
        const fullPaymentIntent: any = paymentIntent;
        
        // Extract charge ID from charges array (first charge)
        const chargeId = fullPaymentIntent.charges?.data?.[0]?.id || null;
        
        // Build complete payment details object
        const paymentDetails: StripePaymentDetails = {
          payment_intent_id: paymentIntent.id,
          payment_method_id: (fullPaymentIntent.payment_method as string) || null,
          customer_id: (fullPaymentIntent.customer as string) || null,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          created: paymentIntent.created,
          charge_id: chargeId,
          full_response: fullPaymentIntent  // Store full response for audit/debugging
        };
        
        
        // Call success callback - booking creation happens here
        onSuccess(paymentDetails);
        
        // Keep loading state true since we're proceeding to success page
        return;
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message);
      onError(error.message);
      setIsLoading(false); // Only disable loading on error
    }
    // Note: No finally block - we want to keep loading=true on success
  };

  return (
    <div className={styles.checkoutContainer}>
      <div className={styles.bookingSummary}>
        <h3>Booking Summary</h3>
        <div className={styles.bookingDetails}>
          <div className={styles.eventInfo}>
            <h4>{bookingData.eventName}</h4>
            <p>{bookingData.eventDate}</p>
          </div>
          <div className={styles.priceInfo}>
            <div className={styles.priceRow}>
              <span>Total Amount</span>
              <span className={styles.totalAmount}>
                {formatPrice(bookingData.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.paymentForm}>
        <div className={styles.paymentSection}>
          <h3>Payment Details</h3>
          
          {paymentError && (
            <div className={styles.error}>
              {paymentError}
            </div>
          )}

          {/* Stripe Payment Element - This is the iframe */}
          <div className={styles.paymentElementContainer}>
            <PaymentElement 
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                },
                defaultValues: {
                  billingDetails: {
                    name: bookingData.customerName || '',
                    email: bookingData.customerEmail || '',
                    phone: bookingData.customerPhone || '',
                  }
                }
              }}
            />
          </div>

          <div className={styles.paymentButtons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isLoading || paymentSucceeded}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isLoading || paymentSucceeded}
              className={styles.payButton}
            >
              {paymentSucceeded ? (
                <>
                  <span className={styles.spinner}></span>
                  Payment Successful - Redirecting...
                </>
              ) : isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : (
                `Pay ${formatPrice(bookingData.totalAmount)}`
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        // NOTE: bookingId is optional now - booking created AFTER payment success

        const response = await fetch(`${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/payments/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: props.bookingData.bookingId, // Optional - may be undefined
            total_amount: props.bookingData.totalAmount,
            customer_email: props.bookingData.customerEmail,
            currency: props.bookingData.currency // Currency is required
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to create payment intent');
        }

        setClientSecret(result.data.client_secret);
      } catch (error: any) {
        console.error('Payment setup error:', error);
        props.onError(error.message);
      }
    };

    createPaymentIntent();
  }, [props.bookingData.totalAmount, props.bookingData.customerEmail, props.bookingData.currency]);

  if (!clientSecret) {
    return (
      <div className={styles.checkoutContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Setting up secure payment...</p>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0F172A',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '6px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default StripeCheckout;