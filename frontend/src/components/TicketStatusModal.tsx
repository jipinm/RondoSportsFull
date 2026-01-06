import React from 'react';
import styles from './TicketStatusModal.module.css';

interface TicketUrl {
  order_item_id: string;
  download_url: string;
  sha_checksum?: string;
  ticket_number?: string;
}

interface TicketStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: number;
    booking_reference: string;
    event_name: string;
    event_date: string;
    eticket_status?: string;
    eticket_available?: boolean;
    eticket_available_date?: string;
    download_count?: number;
  };
  ticketUrls?: TicketUrl[];
  onDownloadSingle?: (orderItemId: string, downloadUrl: string) => void;
  onDownloadZip?: () => void;
}

const TicketStatusModal: React.FC<TicketStatusModalProps> = ({
  isOpen,
  onClose,
  booking,
  ticketUrls = [],
  onDownloadSingle,
  onDownloadZip
}) => {
  if (!isOpen) return null;

  const getStatusInfo = () => {
    const status = booking.eticket_status || 'pending';
    
    const statusConfig: Record<string, { label: string; color: string; emoji: string; description: string }> = {
      available: {
        label: 'Available',
        color: '#10b981',
        emoji: '✅',
        description: 'Your tickets are ready to download!'
      },
      processing: {
        label: 'Processing',
        color: '#f59e0b',
        emoji: '⏳',
        description: 'Your tickets are being generated. This usually takes a few minutes.'
      },
      pending: {
        label: 'Pending',
        color: '#6b7280',
        emoji: '⏰',
        description: 'Tickets will be available closer to the event date.'
      },
      failed: {
        label: 'Failed',
        color: '#ef4444',
        emoji: '❌',
        description: 'There was an issue generating tickets. Please contact support.'
      }
    };

    return statusConfig[status] || statusConfig.pending;
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>🎫 Ticket Status</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Event Info */}
        <div className={styles.eventInfo}>
          <h3>{booking.event_name}</h3>
          <p className={styles.eventDate}>
            📅 {new Date(booking.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
          <p className={styles.bookingRef}>
            Booking Reference: <strong>{booking.booking_reference}</strong>
          </p>
        </div>

        {/* Status Badge */}
        <div
          className={styles.statusBadge}
          style={{
            backgroundColor: `${statusInfo.color}15`,
            borderColor: statusInfo.color
          }}
        >
          <span className={styles.statusEmoji}>{statusInfo.emoji}</span>
          <div className={styles.statusText}>
            <h4 style={{ color: statusInfo.color }}>{statusInfo.label}</h4>
            <p>{statusInfo.description}</p>
          </div>
        </div>

        {/* Download Count */}
        {booking.download_count !== undefined && booking.download_count > 0 && (
          <div className={styles.downloadCount}>
            📥 Downloaded {booking.download_count} time{booking.download_count !== 1 ? 's' : ''}
          </div>
        )}

        {/* Available Date */}
        {booking.eticket_available_date && !booking.eticket_available && (
          <div className={styles.availableDate}>
            <strong>Expected availability:</strong>{' '}
            {new Date(booking.eticket_available_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        )}

        {/* Download Options */}
        {booking.eticket_available && (
          <div className={styles.downloadOptions}>
            <h4>Download Options</h4>
            
            {/* Download All as ZIP */}
            <button
              className={styles.downloadButton}
              onClick={onDownloadZip}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              📦 Download All Tickets (ZIP)
            </button>

            {/* Individual Ticket Downloads */}
            {ticketUrls && ticketUrls.length > 0 && (
              <div className={styles.individualTickets}>
                <h5>Individual Tickets</h5>
                {ticketUrls.map((ticket, index) => (
                  <button
                    key={ticket.order_item_id}
                    className={styles.ticketButton}
                    onClick={() => onDownloadSingle?.(ticket.order_item_id, ticket.download_url)}
                  >
                    📄 Ticket #{index + 1}
                    {ticket.ticket_number && ` (${ticket.ticket_number})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.closeFooterButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketStatusModal;
