import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Mail, Calendar, MapPin } from 'lucide-react';
import type { Ticket, Booking } from '../services/apiRoutes';
import type { GuestFormData } from '../utils/validation';
import styles from './CheckoutPage.module.css';

interface CartItem {
  ticket: Ticket;
  quantity: number;
}

interface ConfirmationState {
  booking?: Booking;
  paymentResult?: any;
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
}

const CheckoutConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ConfirmationState;

  // Redirect if no booking data
  useEffect(() => {
    if (!state || !state.cartItems || state.cartItems.length === 0) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state || !state.cartItems) {
    return null;
  }

  const { booking, cartItems, eventData, guests } = state;

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.ticket.face_value * item.quantity);
  }, 0);

  const orderTotal = subtotal;

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

  const handleDownloadTickets = () => {
    // This would integrate with the e-ticket download API
    alert('E-ticket download functionality will be integrated with the booking API.');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.checkoutPage}>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.confirmationContent}>
            {/* Success Header */}
            <div className={styles.confirmationHeader}>
              <div className={styles.successIconLarge}>
                <CheckCircle size={48} color="#28a745" />
              </div>
              <h1>Booking Confirmed!</h1>
              <p className={styles.confirmationSubtitle}>
                Your tickets have been successfully booked and payment processed.
              </p>
              {booking && (
                <div className={styles.bookingReference}>
                  <strong>Booking Reference: {booking.booking_id}</strong>
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className={styles.confirmationSection}>
              <h2>Event Details</h2>
              <div className={styles.eventCard}>
                <h3>{eventData.event_name}</h3>
                <div className={styles.eventMeta}>
                  <div className={styles.eventMetaItem}>
                    <Calendar size={16} />
                    <span>{new Date(eventData.date_start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className={styles.eventMetaItem}>
                    <MapPin size={16} />
                    <span>{eventData.venue_name}, {eventData.city}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Summary */}
            <div className={styles.confirmationSection}>
              <h2>Your Tickets</h2>
              <div className={styles.ticketsCard}>
                {cartItems.map((item, index) => (
                  <div key={index} className={styles.confirmationTicketItem}>
                    <div className={styles.ticketInfo}>
                      <h4>{item.ticket.ticket_title}</h4>
                      <p className={styles.ticketCategory}>{item.ticket.category_name || 'General Admission'}</p>
                      <p className={styles.ticketQuantity}>Quantity: {item.quantity}</p>
                    </div>
                    <div className={styles.ticketPrice}>
                      {formatPrice(item.ticket.face_value * item.quantity)}
                    </div>
                  </div>
                ))}
                
                <div className={styles.ticketSummaryTotals}>
                  <div className={styles.summaryTotal}>
                    <span>Total Paid</span>
                    <span>{formatPrice(orderTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className={styles.confirmationSection}>
              <h2>Guest Information</h2>
              <div className={styles.guestsCard}>
                {guests.map((guest, index) => (
                  <div key={index} className={styles.confirmationGuestItem}>
                    <div className={styles.guestNumber}>Guest {index + 1}</div>
                    <div className={styles.guestDetails}>
                      <p className={styles.guestName}>
                        {guest.first_name} {guest.last_name}
                        {index === 0 && <span className={styles.leadGuestBadge}> (Lead Guest)</span>}
                      </p>
                      {guest.contact_email && (
                        <p className={styles.guestEmail}>{guest.contact_email}</p>
                      )}
                      {guest.date_of_birth && (
                        <p className={styles.guestDob}>DOB: {new Date(guest.date_of_birth).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className={styles.confirmationSection}>
              <h2>What's Next?</h2>
              <div className={styles.nextStepsCard}>
                <div className={styles.nextStepItem}>
                  <Mail size={20} />
                  <div>
                    <h4>Confirmation Email</h4>
                    <p>A confirmation email with your booking details has been sent to {guests[0]?.contact_email}.</p>
                  </div>
                </div>
                <div className={styles.nextStepItem}>
                  <Download size={20} />
                  <div>
                    <h4>E-Tickets</h4>
                    <p>Your e-tickets will be available for download 24 hours before the event.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.confirmationActions}>
              <button 
                className={styles.secondaryButton}
                onClick={handleDownloadTickets}
              >
                <Download size={16} />
                Download E-Tickets
              </button>
              <button 
                className={styles.primaryButton}
                onClick={handleBackToHome}
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutConfirmationPage;