import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/customerAuth';
import { eTicketService } from '../services/eTicketService';
import { cancellationService } from '../services/cancellationService';
import CancellationRequestModal from '../components/CancellationRequestModal';
import Toast from '../components/common/Toast';
import type { ToastType } from '../components/common/Toast';
import styles from './BookingsPage.module.css';

interface Booking {
  id: number;
  booking_id: string;
  booking_reference: string;
  api_booking_id?: string;
  api_reservation_id?: string;
  event_name: string;
  event_date: string;
  venue: string;
  venue_name?: string;
  seat_type: string;
  category_name?: string;
  quantity: number;
  ticket_count: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  sport_type?: string;
  tournament_name?: string;
  booking_date: string;
  confirmed_at?: string;
  cancelled_at?: string;
  customer_notes?: string;
  // E-Ticket fields
  eticket_status?: string;
  eticket_available?: boolean;
  eticket_available_date?: string;
  download_count?: number;
  xs2event_booking_status?: string;
  xs2event_booking_code?: string;
  // Cancellation fields
  cancellation_status?: string;
  cancellation_request_id?: number;
  cancellation_request_date?: string;
  cancellation_reason?: string;
}

const BookingsPage: React.FC = () => {
  const { customer, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTickets, setDownloadingTickets] = useState<Set<number>>(new Set());
  const [checkingAvailability, setCheckingAvailability] = useState<Set<number>>(new Set());
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !customer) {
      navigate('/login');
      return;
    }
    
    fetchBookings();
  }, [isAuthenticated, customer, navigate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!customer?.email) {
        setError('Customer email not available');
        setLoading(false);
        return;
      }

      // Call the API to get customer bookings
      const response = await fetch(
        `${import.meta.env.VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings/customer/${encodeURIComponent(customer.email)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Sort bookings by latest first (most recent booking_date)
        const sortedBookings = (result.data || []).sort((a: Booking, b: Booking) => {
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
        });
        setBookings(sortedBookings);
      } else {
        throw new Error(result.error || 'Failed to fetch bookings');
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load bookings');
      setLoading(false);
    }
  };

  /**
   * Handle ticket download - downloads all tickets as ZIP
   */
  const handleDownloadTickets = async (booking: Booking) => {
    try {
      // Check if tickets are available
      if (!booking.eticket_available) {
        setToast({
          message: `Tickets are not yet available. Status: ${booking.eticket_status || 'pending'}. Please check back later or try refreshing the status.`,
          type: 'warning'
        });
        return;
      }

      setDownloadingTickets(prev => new Set(prev).add(booking.id));

      await eTicketService.downloadTicketZip(booking.id);

      // Refresh bookings to update download count
      await fetchBookings();
    } catch (err: any) {
      console.error('Error downloading tickets:', err);
      setToast({
        message: `Failed to download tickets: ${err.message}`,
        type: 'error'
      });
    } finally {
      setDownloadingTickets(prev => {
        const next = new Set(prev);
        next.delete(booking.id);
        return next;
      });
    }
  };

  /**
   * Handle check ticket availability - force refresh from XS2Event
   */
  const handleCheckAvailability = async (booking: Booking) => {
    try {
      setCheckingAvailability(prev => new Set(prev).add(booking.id));

      const status = await eTicketService.checkAvailability(booking.id);

      // Update the booking in state with new ticket status
      setBookings(prevBookings =>
        prevBookings.map(b =>
          b.id === booking.id
            ? {
                ...b,
                eticket_status: status.status,
                eticket_available: status.available,
                eticket_available_date: status.eticket_available_date,
                download_count: status.download_count
              }
            : b
        )
      );

      if (status.available) {
        setToast({
          message: 'Tickets are now available for download!',
          type: 'success'
        });
      } else {
        setToast({
          message: `Ticket Status: ${status.status}. ${status.message || 'Tickets are not yet available. Please check back later.'}`,
          type: 'info'
        });
      }
    } catch (err: any) {
      console.error('Error checking ticket availability:', err);
      setToast({
        message: `Failed to check availability: ${err.message}`,
        type: 'error'
      });
    } finally {
      setCheckingAvailability(prev => {
        const next = new Set(prev);
        next.delete(booking.id);
        return next;
      });
    }
  };

  /**
   * Open cancellation request modal
   */
  const handleOpenCancellationModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancellationModalOpen(true);
  };

  /**
   * Close cancellation request modal
   */
  const handleCloseCancellationModal = () => {
    setCancellationModalOpen(false);
    setSelectedBooking(null);
  };

  /**
   * Submit cancellation request
   */
  const handleSubmitCancellation = async (reason: string) => {
    if (!selectedBooking) return;

    try {
      const response = await cancellationService.requestCancellation(
        selectedBooking.id,
        { cancellation_reason: reason }
      );

      if (response.success) {
        setToast({
          message: 'Cancellation request submitted successfully! Your request will be reviewed by our team. You will receive an email notification once a decision has been made.',
          type: 'success'
        });
        
        // Close modal first
        handleCloseCancellationModal();
        
        // Refresh bookings to get the latest data from server
        await fetchBookings();
      } else {
        throw new Error(response.error || response.message || 'Failed to submit cancellation request');
      }
    } catch (err: any) {
      console.error('Error submitting cancellation request:', err);
      setToast({
        message: `Failed to submit cancellation request: ${err.message}`,
        type: 'error'
      });
      throw err; // Re-throw to let modal handle it
    }
  };

  /**
   * Check if booking can be cancelled
   */
  const canRequestCancellation = (booking: Booking): boolean => {
    // Cannot cancel if already cancelled or has any cancellation request (pending, approved, or declined)
    if (booking.status === 'cancelled') return false;
    if (booking.cancellation_status && ['pending', 'approved', 'declined', 'rejected'].includes(booking.cancellation_status)) return false;
    
    // Cannot cancel if event has already passed
    const eventDate = new Date(booking.event_date);
    const now = new Date();
    if (eventDate < now) return false;

    return true;
  };

  /**
   * Get cancellation status badge
   */
  const getCancellationStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
      pending: { label: 'Pending Review', color: '#f59e0b', emoji: '⏳' },
      approved: { label: 'Approved', color: '#10b981', emoji: '✅' },
      declined: { label: 'Declined', color: '#ef4444', emoji: '❌' },
      rejected: { label: 'Declined', color: '#ef4444', emoji: '❌' }, // Legacy support
      completed: { label: 'Completed', color: '#6b7280', emoji: '✓' },
      cancelled: { label: 'Cancelled', color: '#6b7280', emoji: '×' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`
        }}
      >
        {config.emoji} {config.label}
      </span>
    );
  };

  /**
   * Get status badge color based on ticket status
   */
  const getTicketStatusBadge = (booking: Booking) => {
    const status = booking.eticket_status || 'pending';
    
    const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
      available: { label: 'Available', color: '#10b981', emoji: '✅' },
      processing: { label: 'Processing', color: '#f59e0b', emoji: '⏳' },
      pending: { label: 'Pending', color: '#6b7280', emoji: '⏰' },
      failed: { label: 'Failed', color: '#ef4444', emoji: '❌' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`
        }}
      >
        {config.emoji} {config.label}
      </span>
    );
  };

  if (!isAuthenticated || !customer) {
    // User will be redirected to login in useEffect
    return null;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>My Bookings</h1>
          <div className={styles.loading}>Loading your bookings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>My Bookings</h1>
          <div className={styles.error}>{error}</div>
          <button onClick={fetchBookings} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>My Bookings</h1>
          <Link to="/profile" className={styles.backButton}>
            Back to Profile
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No bookings found</h2>
            <p>You haven't made any bookings yet. Start exploring events!</p>
            <Link to="/events" className={styles.exploreButton}>
              Explore Events
            </Link>
          </div>
        ) : (
          <div className={styles.bookingsList}>
            {bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingCard}>
                <div className={styles.bookingHeader}>
                  <h3 className={styles.bookingTitle}>{booking.event_name}</h3>
                  
                  <div className={styles.bookingMeta}>
                    <div className={styles.metaItem}>
                      📅 {new Date(booking.event_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className={styles.metaItem}>
                      🕒 {new Date(booking.event_date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                    <div className={styles.metaItem}>
                      📍 {booking.venue_name || booking.venue || 'TBD'}
                    </div>
                  </div>

                  <div className={styles.statusRow}>
                    <div className={styles.bookingId}>
                      #{booking.booking_reference || booking.booking_id}
                      {booking.api_reservation_id && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                          | Res: {booking.api_reservation_id}
                        </span>
                      )}
                    </div>
                    <div className={styles.statusGroup}>
                      <span className={`${styles.status} ${styles[booking.status]}`}>
                        {booking.status}
                      </span>
                      {booking.payment_status && (
                        <span className={`${styles.paymentStatus} ${styles[booking.payment_status]}`}>
                          {booking.payment_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={styles.bookingDetails}>
                  {booking.sport_type && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Sport</span>
                      <span className={styles.detailValue}>{booking.sport_type}</span>
                    </div>
                  )}
                  {booking.tournament_name && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Tournament</span>
                      <span className={styles.detailValue}>{booking.tournament_name}</span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Category</span>
                    <span className={styles.detailValue}>{booking.category_name || booking.seat_type || 'General'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Tickets</span>
                    <span className={styles.detailValue}>{booking.ticket_count || booking.quantity} × tickets</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Amount</span>
                    <span className={`${styles.detailValue} ${styles.amount}`}>
                      {booking.currency ? 
                        new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: booking.currency 
                        }).format(booking.total_amount) : 
                        `$${booking.total_amount.toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Booked On</span>
                    <span className={styles.detailValue}>
                      {new Date(booking.booking_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {booking.customer_notes && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Guests</span>
                      <span className={styles.detailValue}>{booking.customer_notes}</span>
                    </div>
                  )}
                  
                  {/* E-Ticket Status Row */}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Ticket Status</span>
                    <span className={styles.detailValue}>
                      {getTicketStatusBadge(booking)}
                    </span>
                  </div>
                  
                  {booking.download_count !== undefined && booking.download_count > 0 && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Downloads</span>
                      <span className={styles.detailValue}>
                        📥 {booking.download_count} time{booking.download_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  
                  {/* Cancellation Status Row */}
                  {booking.cancellation_request_id && booking.cancellation_status && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Cancellation</span>
                      <span className={styles.detailValue}>
                        {getCancellationStatusBadge(booking.cancellation_status)}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.bookingActions}>
                  {/* Check Availability Button */}
                  <button
                    className={styles.viewButton}
                    onClick={() => handleCheckAvailability(booking)}
                    disabled={checkingAvailability.has(booking.id)}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      opacity: checkingAvailability.has(booking.id) ? 0.6 : 1,
                      cursor: checkingAvailability.has(booking.id) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {checkingAvailability.has(booking.id) ? '🔄 Checking...' : '🔄 Check Status'}
                  </button>

                  {/* Download Tickets Button */}
                  <button
                    className={styles.viewButton}
                    onClick={() => handleDownloadTickets(booking)}
                    disabled={!booking.eticket_available || downloadingTickets.has(booking.id)}
                    style={{
                      background: booking.eticket_available
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      opacity: downloadingTickets.has(booking.id) ? 0.6 : 1,
                      cursor: !booking.eticket_available || downloadingTickets.has(booking.id) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {downloadingTickets.has(booking.id)
                      ? '📥 Downloading...'
                      : booking.eticket_available
                      ? '📄 Download Tickets'
                      : '📄 Not Available Yet'}
                  </button>

                  {/* Request Cancellation Button */}
                  {canRequestCancellation(booking) && (
                    <button
                      className={styles.viewButton}
                      onClick={() => handleOpenCancellationModal(booking)}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        cursor: 'pointer'
                      }}
                    >
                      🚫 Request Cancellation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cancellation Request Modal */}
        {selectedBooking && (
          <CancellationRequestModal
            isOpen={cancellationModalOpen}
            onClose={handleCloseCancellationModal}
            onSubmit={handleSubmitCancellation}
            bookingReference={selectedBooking.booking_reference || selectedBooking.booking_id}
            eventName={selectedBooking.event_name}
          />
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={5000}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default BookingsPage;