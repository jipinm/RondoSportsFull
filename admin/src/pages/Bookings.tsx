import React, { useState, useEffect } from 'react';
import { X, Eye, RefreshCw, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { bookingService } from '../services/booking-service';
import type { Booking, BookingFilters } from '../services/booking-service';
import { RefundModal } from '../components/RefundModal';
import styles from './Bookings.module.css';

interface BookingDetailsModalProps {
  booking: Booking | null;
  onClose: () => void;
}

interface SyncConfirmationModalProps {
  isOpen: boolean;
  bookingReference: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SyncConfirmationModal: React.FC<SyncConfirmationModalProps> = ({ isOpen, bookingReference, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Confirm XS2Event Sync</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <RefreshCw size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', marginBottom: '12px', color: '#374151' }}>
              Are you sure you want to manually sync this booking with XS2Event?
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              <strong>Booking Reference:</strong> {bookingReference}
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              This will create a reservation, submit guest data, and retrieve e-tickets from XS2Event.
            </p>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={styles.primaryButton} 
            onClick={onConfirm}
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
          >
            <RefreshCw size={16} /> Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLabel = (text: string) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Booking Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.bookingInfoGrid}>
            {/* Basic Booking Information */}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Booking Reference:</span>
              <span className={styles.bookingInfoValue}>{booking.booking_reference || booking.id}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Event:</span>
              <span className={styles.bookingInfoValue}>{booking.event_name}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Venue:</span>
              <span className={styles.bookingInfoValue}>{booking.venue_name || 'N/A'}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Tournament:</span>
              <span className={styles.bookingInfoValue}>{booking.tournament_name || 'N/A'}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Sport Type:</span>
              <span className={styles.bookingInfoValue}>{booking.sport_type || 'N/A'}</span>
            </div>
            
            {/* Customer Information */}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Customer:</span>
              <span className={styles.bookingInfoValue}>{booking.user.name}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Email:</span>
              <span className={styles.bookingInfoValue}>{booking.user.email}</span>
            </div>
            {booking.user.phone && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Phone:</span>
                <span className={styles.bookingInfoValue}>{booking.user.phone}</span>
              </div>
            )}
            
            {/* Payment Information */}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Total Amount:</span>
              <span className={styles.bookingInfoValue}>{booking.currency} {booking.total_amount.toFixed(2)}</span>
            </div>
            {booking.payment_method && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Payment Method:</span>
                <span className={styles.bookingInfoValue}>{booking.payment_method}</span>
              </div>
            )}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Payment Status:</span>
              <span className={`${styles.bookingStatus} ${styles[booking.payment_status]}`}>
                {formatLabel(booking.payment_status)}
              </span>
            </div>
            {booking.payment_intent_id && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Payment ID (Transaction ID):</span>
                <span className={styles.bookingInfoValue} style={{fontSize: '0.85em', wordBreak: 'break-all'}}>{booking.payment_intent_id}</span>
              </div>
            )}
            {booking.payment_reference && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Payment Reference:</span>
                <span className={styles.bookingInfoValue}>{booking.payment_reference}</span>
              </div>
            )}
            {booking.payment_completed_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Payment Completed:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.payment_completed_at)}</span>
              </div>
            )}
            {booking.payment_gateway_fee && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Gateway Fee:</span>
                <span className={styles.bookingInfoValue}>{booking.currency} {booking.payment_gateway_fee.toFixed(2)}</span>
              </div>
            )}
            
            {/* Stripe Information */}
            {booking.stripe_session_id && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Stripe Session ID:</span>
                <span className={styles.bookingInfoValue} style={{fontSize: '0.85em'}}>{booking.stripe_session_id}</span>
              </div>
            )}
            {booking.stripe_customer_id && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Stripe Customer:</span>
                <span className={styles.bookingInfoValue} style={{fontSize: '0.85em'}}>{booking.stripe_customer_id}</span>
              </div>
            )}
            {booking.stripe_payment_method_id && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Stripe Payment Method:</span>
                <span className={styles.bookingInfoValue} style={{fontSize: '0.85em'}}>{booking.stripe_payment_method_id}</span>
              </div>
            )}
            {booking.stripe_charge_id && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Stripe Charge ID:</span>
                <span className={styles.bookingInfoValue} style={{fontSize: '0.85em'}}>{booking.stripe_charge_id}</span>
              </div>
            )}
            {booking.commission_amount !== undefined && booking.commission_amount > 0 && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Commission Amount:</span>
                <span className={styles.bookingInfoValue}>{booking.currency} {booking.commission_amount.toFixed(2)}</span>
              </div>
            )}
            
            {/* Status Information */}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Booking Status:</span>
              <span className={`${styles.bookingStatus} ${styles[booking.status]}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Booking Date:</span>
              <span className={styles.bookingInfoValue}>{formatDate(booking.booking_date)}</span>
            </div>
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>Event Date:</span>
              <span className={styles.bookingInfoValue}>{formatDate(booking.event_date)}</span>
            </div>
            {booking.confirmed_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Confirmed At:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.confirmed_at)}</span>
              </div>
            )}
            {booking.cancelled_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Cancelled At:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.cancelled_at)}</span>
              </div>
            )}
            {booking.event_start_time && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Event Start Time:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.event_start_time)}</span>
              </div>
            )}
            {booking.source && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Booking Source:</span>
                <span className={styles.bookingInfoValue}>{booking.source.charAt(0).toUpperCase() + booking.source.slice(1)}</span>
              </div>
            )}
            {booking.created_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Created At:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.created_at)}</span>
              </div>
            )}
            {booking.updated_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Last Updated:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.updated_at)}</span>
              </div>
            )}
            
            {/* XS2Event Integration */}
            {booking.api_booking_id && (
              <>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>XS2Event Booking ID:</span>
                  <span className={styles.bookingInfoValue} style={{fontSize: '0.85em', wordBreak: 'break-all'}}>{booking.api_booking_id}</span>
                </div>
                {booking.api_reservation_id && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>XS2Event Reservation ID:</span>
                    <span className={styles.bookingInfoValue} style={{fontSize: '0.85em', wordBreak: 'break-all'}}>{booking.api_reservation_id}</span>
                  </div>
                )}
                {booking.xs2event_booking_status && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>XS2Event Status:</span>
                    <span className={`${styles.bookingStatus} ${styles[booking.xs2event_booking_status.toLowerCase().replace(/\s+/g, '_')]}`}>
                      {booking.xs2event_booking_status}
                    </span>
                  </div>
                )}
                {booking.xs2event_logistic_status && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Logistic Status:</span>
                    <span className={`${styles.bookingStatus} ${styles[booking.xs2event_logistic_status.toLowerCase().replace(/\s+/g, '_')]}`}>
                      {booking.xs2event_logistic_status}
                    </span>
                  </div>
                )}
                {booking.xs2event_distribution_channel && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Distribution Channel:</span>
                    <span className={styles.bookingInfoValue}>{booking.xs2event_distribution_channel}</span>
                  </div>
                )}
                {booking.xs2event_synced_at && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Last Synced:</span>
                    <span className={styles.bookingInfoValue}>{formatDate(booking.xs2event_synced_at)}</span>
                  </div>
                )}
                {booking.xs2event_sync_attempts !== undefined && booking.xs2event_sync_attempts > 0 && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Sync Attempts:</span>
                    <span className={styles.bookingInfoValue}>{booking.xs2event_sync_attempts}</span>
                  </div>
                )}
              </>
            )}
            
            {/* E-Ticket Information */}
            <div className={styles.bookingInfoItem}>
              <span className={styles.bookingInfoLabel}>E-Ticket Status:</span>
              <span className={`${styles.bookingStatus} ${styles[booking.eticket_status || 'pending']}`}>
                {(booking.eticket_status || 'pending').charAt(0).toUpperCase() + (booking.eticket_status || 'pending').slice(1)}
              </span>
            </div>
            {booking.eticket_available_date && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Tickets Available:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.eticket_available_date)}</span>
              </div>
            )}
            {booking.download_count !== undefined && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Download Count:</span>
                <span className={styles.bookingInfoValue}>{booking.download_count}</span>
              </div>
            )}
            {booking.first_downloaded_at && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>First Downloaded:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.first_downloaded_at)}</span>
              </div>
            )}
            {booking.last_download_attempt && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Last Download Attempt:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.last_download_attempt)}</span>
              </div>
            )}
            {booking.ticket_expiry_date && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Ticket Expiry Date:</span>
                <span className={styles.bookingInfoValue}>{formatDate(booking.ticket_expiry_date)}</span>
              </div>
            )}
            {booking.zip_download_url && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>ZIP Download:</span>
                <span className={styles.bookingInfoValue}>
                  <a href={booking.zip_download_url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                    Download All Tickets
                  </a>
                </span>
              </div>
            )}
            {booking.download_error_message && (
              <div className={styles.bookingInfoItem}>
                <span className={styles.bookingInfoLabel}>Download Error:</span>
                <span className={styles.bookingInfoValue} style={{color: '#c62828'}}>{booking.download_error_message}</span>
              </div>
            )}
            
            {/* Refund Information */}
            {booking.refund_id && (
              <>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>Refund ID:</span>
                  <span className={styles.bookingInfoValue}>{booking.refund_id}</span>
                </div>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>Refund Amount:</span>
                  <span className={styles.bookingInfoValue}>{booking.currency} {booking.refund_amount ? Number(booking.refund_amount).toFixed(2) : '0.00'}</span>
                </div>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>Refund Reason:</span>
                  <span className={styles.bookingInfoValue}>{booking.refund_reason ? formatLabel(booking.refund_reason) : 'N/A'}</span>
                </div>
                {booking.refunded_at && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Refunded At:</span>
                    <span className={styles.bookingInfoValue}>{formatDate(booking.refunded_at)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Cancellation Request Information */}
            {(booking.cancellation_request_id || (booking.cancellation_status && booking.cancellation_status !== 'none')) && (
              <>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>Cancellation Status:</span>
                  <span className={`${styles.bookingStatus} ${styles[booking.cancellation_status || 'none']}`}>
                    {formatLabel(booking.cancellation_status || 'none')}
                  </span>
                </div>
                <div className={styles.bookingInfoItem}>
                  <span className={styles.bookingInfoLabel}>Cancellation Requested:</span>
                  <span className={styles.bookingInfoValue}>{booking.cancellation_request_date ? formatDate(booking.cancellation_request_date) : 'N/A'}</span>
                </div>
                {booking.cancellation_reason && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Cancellation Reason:</span>
                    <span className={styles.bookingInfoValue}>{booking.cancellation_reason}</span>
                  </div>
                )}
                {booking.cancellation_customer_notes && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Customer Notes:</span>
                    <span className={styles.bookingInfoValue}>{booking.cancellation_customer_notes}</span>
                  </div>
                )}
                {booking.cancellation_admin_notes && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Admin Notes:</span>
                    <span className={styles.bookingInfoValue}>{booking.cancellation_admin_notes}</span>
                  </div>
                )}
                {booking.cancellation_reviewed_date && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Reviewed Date:</span>
                    <span className={styles.bookingInfoValue}>{formatDate(booking.cancellation_reviewed_date)}</span>
                  </div>
                )}
                {booking.cancellation_refund_amount !== undefined && Number(booking.cancellation_refund_amount) > 0 && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Cancellation Refund Amount:</span>
                    <span className={styles.bookingInfoValue}>{booking.currency} {Number(booking.cancellation_refund_amount).toFixed(2)}</span>
                  </div>
                )}
                {booking.cancellation_refund_status && booking.cancellation_refund_status !== 'not_applicable' && (
                  <div className={styles.bookingInfoItem}>
                    <span className={styles.bookingInfoLabel}>Cancellation Refund Status:</span>
                    <span className={`${styles.bookingStatus} ${styles[booking.cancellation_refund_status]}`}>
                      {booking.cancellation_refund_status.charAt(0).toUpperCase() + booking.cancellation_refund_status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className={styles.ticketDetailsSection}>
            <h3 className={styles.sectionTitle}>Ticket Details</h3>
            <div className={styles.ticketInfo}>
              <div className={styles.ticketInfoItem}>
                <span className={styles.ticketInfoLabel}>Number of Tickets:</span>
                <span className={styles.ticketInfoValue}>{booking.ticket_count || booking.number_of_tickets}</span>
              </div>
              <div className={styles.ticketInfoItem}>
                <span className={styles.ticketInfoLabel}>Price per Ticket:</span>
                <span className={styles.ticketInfoValue}>{booking.currency} {booking.ticket_price.toFixed(2)}</span>
              </div>
              {booking.category_name && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Category:</span>
                  <span className={styles.ticketInfoValue}>{booking.category_name}</span>
                </div>
              )}
              {booking.seat_info && Object.keys(booking.seat_info).length > 0 && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Seat Information:</span>
                  <span className={styles.ticketInfoValue}>
                    <pre style={{fontSize: '0.85em', margin: 0, whiteSpace: 'pre-wrap'}}>
                      {JSON.stringify(booking.seat_info, null, 2)}
                    </pre>
                  </span>
                </div>
              )}
              {booking.customer_notes && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Guests:</span>
                  <span className={styles.ticketInfoValue}>{booking.customer_notes}</span>
                </div>
              )}
              {booking.admin_notes && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Admin Notes:</span>
                  <span className={styles.ticketInfoValue}>{booking.admin_notes}</span>
                </div>
              )}
              {booking.modified_by && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Last Modified By:</span>
                  <span className={styles.ticketInfoValue}>{booking.modified_by_name || `Admin ID: ${booking.modified_by}`}</span>
                </div>
              )}
              {booking.last_sync_at && (
                <div className={styles.ticketInfoItem}>
                  <span className={styles.ticketInfoLabel}>Last API Sync:</span>
                  <span className={styles.ticketInfoValue}>{formatDate(booking.last_sync_at)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* XS2Event Errors */}
          {booking.xs2event_last_error && (
            <div className={styles.errorSection}>
              <h3 className={styles.sectionTitle}>XS2Event Sync Error</h3>
              <div className={styles.errorContent}>
                <AlertCircle size={18} />
                <span>{booking.xs2event_last_error}</span>
              </div>
              {booking.xs2event_sync_attempts && (
                <p className={styles.errorMeta}>Sync attempts: {booking.xs2event_sync_attempts}</p>
              )}
            </div>
          )}
          
          
          {/* Debug: XS2Event Response Data */}
          {booking.xs2event_response_data && (
            <details className={styles.debugSection}>
              <summary className={styles.debugSummary}>🔧 XS2Event Response Data (Debug)</summary>
              <pre className={styles.debugContent}>
                {typeof booking.xs2event_response_data === 'string' 
                  ? booking.xs2event_response_data 
                  : JSON.stringify(booking.xs2event_response_data, null, 2)}
              </pre>
            </details>
          )}
          
          {/* Debug: Full API Data */}
          {booking.api_data && Object.keys(booking.api_data).length > 0 && (
            <details className={styles.debugSection}>
              <summary className={styles.debugSummary}>🔍 API Data (Debug)</summary>
              <pre className={styles.debugContent}>
                {JSON.stringify(booking.api_data, null, 2)}
              </pre>
            </details>
          )}
          
          {/* Debug: E-Ticket URLs */}
          {booking.eticket_urls && (
            <details className={styles.debugSection}>
              <summary className={styles.debugSummary}>🎫 E-Ticket URLs (JSON)</summary>
              <pre className={styles.debugContent}>
                {typeof booking.eticket_urls === 'string' 
                  ? booking.eticket_urls 
                  : JSON.stringify(booking.eticket_urls, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const Bookings: React.FC = () => {
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [syncBooking, setSyncBooking] = useState<Booking | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [cancellationStatusFilter, setCancellationStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  
  const itemsPerPage = 5;

  // Fetch bookings data
  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const filters: BookingFilters = {
        page: currentPage,
        per_page: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentStatusFilter !== 'all' && { payment_status: paymentStatusFilter }),
        ...(cancellationStatusFilter !== 'all' && { cancellation_status: cancellationStatusFilter })
      };

      const response = await bookingService.getBookings(filters);
      setBookingsList(response.bookings);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch bookings',
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#fff',
            fontWeight: '500',
          },
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchBookings();
  }, [currentPage, searchTerm, statusFilter, paymentStatusFilter, cancellationStatusFilter]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLabel = (text: string) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePaymentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPaymentStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleCancellationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCancellationStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  /**
   * Sync booking with XS2Event API
   */
  const handleSyncWithXS2Event = async (id: string) => {
    // Close the confirmation modal
    setSyncBooking(null);
    
    // Show loading toast
    const loadingToast = toast.loading('Syncing with XS2Event...', {
      position: 'top-right',
    });
    
    try {
      setLoading(true);
      const result = await bookingService.syncWithXS2Event(id);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (result.success) {
        toast.success(
          result.message || 'Booking synced successfully with XS2Event!',
          {
            duration: 5000,
            position: 'top-right',
            style: {
              background: '#10b981',
              color: '#fff',
              fontWeight: '500',
            },
          }
        );
        // Refresh bookings to get updated data
        fetchBookings();
      } else {
        toast.error(
          `Sync failed: ${result.message}`,
          {
            duration: 6000,
            position: 'top-right',
            style: {
              background: '#ef4444',
              color: '#fff',
              fontWeight: '500',
            },
          }
        );
      }
    } catch (err) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with XS2Event';
      toast.error(
        `Error: ${errorMessage}`,
        {
          duration: 6000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#fff',
            fontWeight: '500',
          },
        }
      );
      console.error('Error syncing with XS2Event:', err);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Process refund for a booking
   */
  const handleProcessRefund = async (amount: number | null, reason: string, notes: string) => {
    if (!refundBooking) return;
    
    try {
      setLoading(true);
      const result = await bookingService.processRefund(
        refundBooking.id,
        amount ?? undefined,
        reason,
        notes
      );
      
      if (result.success) {
        toast.success(
          `Refund processed successfully!\nRefund ID: ${result.data?.refund_id}\nAmount: ${result.data?.currency} ${result.data?.refund_amount}`,
          {
            duration: 5000,
            position: 'top-right',
            style: {
              background: '#10b981',
              color: '#fff',
              fontWeight: '500',
            },
          }
        );
        // Refresh bookings to get updated data
        fetchBookings();
        setRefundBooking(null);
      } else {
        toast.error(`Refund failed: ${result.message}`, {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#fff',
            fontWeight: '500',
          },
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process refund';
      toast.error(`Error: ${errorMessage}`, {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '500',
        },
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Since we're using server-side pagination and filtering,
  // we don't need client-side filtering anymore
  const paginatedBookings = bookingsList || [];
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={styles.bookingsContainer}>
      <h1 className={styles.pageTitle}>Event Bookings</h1>
        <div className={styles.filtersContainer}>        <div className={`${styles.filterItem} ${styles.searchFilterItem}`}>
          <label htmlFor="searchInput">Search</label>
          <div className={styles.searchBox}>
            <input
              id="searchInput"
              type="text"
              placeholder="Search bookings..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
          <div className={styles.filterItem}>
          <label htmlFor="statusFilter">Booking Status</label>
          <select 
            id="statusFilter"
            className={styles.filterSelect} 
            value={statusFilter} 
            onChange={handleFilterChange}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
          <div className={styles.filterItem}>
          <label htmlFor="paymentStatusFilter">Payment Status</label>
          <select 
            id="paymentStatusFilter"
            className={styles.filterSelect} 
            value={paymentStatusFilter} 
            onChange={handlePaymentFilterChange}
          >
            <option value="all">All Payment Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </select>
        </div>
          <div className={styles.filterItem}>
          <label htmlFor="cancellationStatusFilter">Cancellation Request</label>
          <select 
            id="cancellationStatusFilter"
            className={styles.filterSelect} 
            value={cancellationStatusFilter} 
            onChange={handleCancellationFilterChange}
          >
            <option value="all">All</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.bookingsTable}>
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Event Name</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Booking Status</th>
              <th>Payment Status</th>
              <th>Cancellation Request</th>
              <th>XS2Event ID</th>
              <th>Booking Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className={styles.loadingCell}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Loading bookings...</span>
                </td>
              </tr>
            ) : paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <span className={styles.bookingRef} title={booking.booking_reference}>
                      {booking.booking_reference || `#${booking.id}`}
                    </span>
                  </td>
                  <td>
                    <div className={styles.eventCell}>
                      <span className={styles.eventName}>{booking.event_name}</span>
                      {booking.venue_name && (
                        <span className={styles.venueName}>{booking.venue_name}</span>
                      )}
                    </div>
                  </td>
                  <td>{booking.user.name}</td>
                  <td>
                    <span className={styles.amount}>
                      {booking.currency} {booking.total_amount.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.bookingStatus} ${styles[booking.status]}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.paymentStatus} ${styles[booking.payment_status]}`}>
                      {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {booking.cancellation_status && booking.cancellation_status !== 'none' ? (
                      <span className={`${styles.bookingStatus} ${styles[booking.cancellation_status]}`}>
                        {formatLabel(booking.cancellation_status)}
                      </span>
                    ) : (
                      <span className={styles.noRequest}>-</span>
                    )}
                  </td>
                  <td>
                    {booking.api_booking_id ? (
                      <span className={styles.apiId} title={booking.api_booking_id}>
                        {booking.api_booking_id.substring(0, 8)}...
                      </span>
                    ) : (
                      <span className={styles.notSynced}>Not Synced</span>
                    )}
                  </td>
                  <td>{formatDate(booking.booking_date)}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.viewButton}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Eye size={16} /> View
                      </button>
                      
                      {!booking.api_booking_id && booking.status === 'confirmed' && (
                        <button 
                          className={styles.syncButton}
                          onClick={() => setSyncBooking(booking)}
                          title="Sync with XS2Event"
                        >
                          <RefreshCw size={16} /> Sync
                        </button>
                      )}
                      
                      {(booking.payment_status === 'completed' || booking.payment_status === 'partially_refunded') && booking.payment_intent_id && (
                        <button 
                          className={styles.refundButton}
                          onClick={() => setRefundBooking(booking)}
                          title="Process Refund"
                        >
                          <DollarSign size={16} /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className={styles.noResults}>
                  No bookings found matching your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>
          
          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`${styles.pageNumberButton} ${currentPage === page ? styles.activePage : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            className={styles.paginationButton}
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
      
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      
      {refundBooking && (
        <RefundModal
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          onConfirm={handleProcessRefund}
        />
      )}
      
      {syncBooking && (
        <SyncConfirmationModal
          isOpen={true}
          bookingReference={syncBooking.booking_reference || `#${syncBooking.id}`}
          onConfirm={() => handleSyncWithXS2Event(syncBooking.id)}
          onCancel={() => setSyncBooking(null)}
        />
      )}
      
      <Toaster />
    </div>
  );
};

export default Bookings;