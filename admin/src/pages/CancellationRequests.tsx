import React, { useState, useEffect } from 'react';
import { X, Eye, Check, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cancellationService } from '../services/cancellation-service';
import type { CancellationRequest, CancellationRequestFilters, CancellationRequestStats } from '../services/cancellation-service';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import styles from './CancellationRequests.module.css';

interface CancellationRequestModalProps {
  request: CancellationRequest | null;
  onClose: () => void;
  onApprove: (id: number, notes?: string) => void;
  onDecline: (id: number, notes: string) => void;
}

const CancellationRequestModal: React.FC<CancellationRequestModalProps> = ({ 
  request, 
  onClose, 
  onApprove, 
  onDecline 
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'decline' | null>(null);
  const [validationError, setValidationError] = useState('');

  if (!request) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(request.id, adminNotes || undefined);
    } else if (action === 'decline') {
      if (!adminNotes.trim()) {
        setValidationError('Please provide a reason for declining this request');
        return;
      }
      if (adminNotes.trim().length < 10) {
        setValidationError('Reason for declining must be at least 10 characters');
        return;
      }
      onDecline(request.id, adminNotes);
    }
    setAdminNotes('');
    setAction(null);
    setValidationError('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
      pending: { label: 'Pending Review', color: '#f59e0b', emoji: '⏳' },
      approved: { label: 'Approved', color: '#10b981', emoji: '✅' },
      declined: { label: 'Declined', color: '#ef4444', emoji: '❌' },
      rejected: { label: 'Declined', color: '#ef4444', emoji: '❌' }, // Legacy support
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: '600',
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`
      }}>
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Cancellation Request Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          {/* Request Status */}
          <div className={styles.statusSection}>
            <span className={styles.label}>Status:</span>
            {getStatusBadge(request.status)}
          </div>

          {/* Booking Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Booking Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Booking Reference:</span>
                <span className={styles.value}>{request.booking?.booking_reference || `#${request.booking_id}`}</span>
              </div>
              <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.label}>XS2Event Booking ID:</span>
                <span className={styles.value} style={{ wordBreak: 'break-all' }}>{request.booking?.api_booking_id || 'N/A'}</span>
              </div>
              <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.label}>Reservation ID:</span>
                <span className={styles.value} style={{ wordBreak: 'break-all' }}>{request.booking?.api_reservation_id || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Event:</span>
                <span className={styles.value}>{request.booking?.event_name || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Event Date:</span>
                <span className={styles.value}>
                  {request.booking?.event_date ? formatDate(request.booking.event_date) : 'N/A'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Venue:</span>
                <span className={styles.value}>{request.booking?.venue_name || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Total Amount:</span>
                <span className={styles.value}>
                  {request.booking?.currency} {request.booking?.total_amount.toFixed(2)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Booking Status:</span>
                <span className={styles.value}>{request.booking?.status || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Customer Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Name:</span>
                <span className={styles.value}>
                  {request.customer ? `${request.customer.first_name} ${request.customer.last_name}` : 'N/A'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{request.customer?.email || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Phone:</span>
                <span className={styles.value}>{request.customer?.phone || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Customer ID:</span>
                <span className={styles.value}>{request.customer?.customer_id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Cancellation Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Cancellation Details</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Request Date:</span>
                <span className={styles.value}>{formatDate(request.created_at)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Customer Reason:</span>
                <span className={styles.value}>{request.cancellation_reason}</span>
              </div>
              {request.reviewed_at && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Reviewed Date:</span>
                    <span className={styles.value}>{formatDate(request.reviewed_at)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Reviewed By:</span>
                    <span className={styles.value}>{request.reviewer?.name || 'N/A'}</span>
                  </div>
                </>
              )}
              {request.admin_notes && (
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.label}>Admin Notes:</span>
                  <span className={styles.value}>{request.admin_notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Section - Only show if pending */}
          {request.status === 'pending' && (
            <div className={styles.actionSection}>
              <h3 className={styles.sectionTitle}>Review Action</h3>
              
              <div className={styles.actionButtons}>
                <button
                  className={`${styles.actionButton} ${styles.approveButton}`}
                  onClick={() => {
                    setAction('approve');
                    setValidationError('');
                  }}
                >
                  <Check size={18} />
                  Approve Cancellation
                </button>
                <button
                  className={`${styles.actionButton} ${styles.declineButton}`}
                  onClick={() => {
                    setAction('decline');
                    setValidationError('');
                  }}
                >
                  <XCircle size={18} />
                  Decline Request
                </button>
              </div>

              {action && (
                <div className={styles.notesSection}>
                  <label className={styles.label}>
                    {action === 'approve' ? 'Admin Notes (Optional):' : 'Reason for Declining (Required):'}
                    {action === 'decline' && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '0.75rem', 
                        color: adminNotes.trim().length >= 10 ? '#10b981' : '#6b7280',
                        fontWeight: 'normal'
                      }}>
                        ({adminNotes.trim().length}/10 characters minimum)
                      </span>
                    )}
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={adminNotes}
                    onChange={(e) => {
                      setAdminNotes(e.target.value);
                      setValidationError('');
                    }}
                    placeholder={action === 'approve' 
                      ? 'Add any notes about this approval...' 
                      : 'Explain why this request is being declined...'}
                    rows={4}
                  />
                  {validationError && (
                    <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '4px' }}>
                      {validationError}
                    </div>
                  )}
                  <div className={styles.submitButtons}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setAction(null);
                        setAdminNotes('');
                        setValidationError('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.submitButton}
                      onClick={handleSubmit}
                    >
                      Confirm {action === 'approve' ? 'Approval' : 'Decline'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CancellationRequests: React.FC = () => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [stats, setStats] = useState<CancellationRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  
  // Toast notifications
  const { toasts, closeToast, success, error: showError } = useToast();
  
  // Filters
  const [filters, setFilters] = useState<CancellationRequestFilters>({
    page: 1,
    per_page: 20,
    status: 'all'
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cancellationService.getCancellationRequests(filters);
      setRequests(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cancellation requests');
      console.error('Error fetching cancellation requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await cancellationService.getCancellationStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleApprove = async (id: number, notes?: string) => {
    try {
      await cancellationService.approveCancellationRequest(id, notes);
      // Update the selected request status immediately
      if (selectedRequest) {
        setSelectedRequest({
          ...selectedRequest,
          status: 'approved',
          admin_notes: notes,
          reviewed_at: new Date().toISOString()
        });
      }
      // Fetch updated data in background
      fetchRequests();
      fetchStats();
      success('Cancellation Approved', 'The cancellation request has been approved successfully.');
    } catch (err: any) {
      showError('Approval Failed', err.message || 'Failed to approve cancellation request');
    }
  };

  const handleDecline = async (id: number, notes: string) => {
    try {
      await cancellationService.declineCancellationRequest(id, notes);
      // Update the selected request status immediately
      if (selectedRequest) {
        setSelectedRequest({
          ...selectedRequest,
          status: 'declined',
          admin_notes: notes,
          reviewed_at: new Date().toISOString()
        });
      }
      // Fetch updated data in background
      fetchRequests();
      fetchStats();
      success('Cancellation Declined', 'The cancellation request has been declined.');
    } catch (err: any) {
      showError('Decline Failed', err.message || 'Failed to decline cancellation request');
    }
  };


  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
      pending: { label: 'Pending', color: '#f59e0b', emoji: '⏳' },
      approved: { label: 'Approved', color: '#10b981', emoji: '✅' },
      declined: { label: 'Declined', color: '#ef4444', emoji: '❌' },
      rejected: { label: 'Declined', color: '#ef4444', emoji: '❌' }, // Legacy support
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: `${config.color}20`,
        color: config.color
      }}>
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cancellation Requests</h1>
          <p className={styles.subtitle}>Manage customer cancellation requests</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshButton} onClick={fetchRequests}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Requests</div>
          </div>
          <div className={`${styles.statCard} ${styles.pending}`}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Pending Review</div>
          </div>
          <div className={`${styles.statCard} ${styles.approved}`}>
            <div className={styles.statValue}>{stats.approved}</div>
            <div className={styles.statLabel}>Approved</div>
          </div>
          <div className={`${styles.statCard} ${styles.declined}`}>
            <div className={styles.statValue}>{stats.declined}</div>
            <div className={styles.statLabel}>Declined</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status:</label>
          <select
            className={styles.filterSelect}
            value={filters.status || 'all'}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search:</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Search by booking ref, customer..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={40} />
          <p>Loading cancellation requests...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <AlertCircle size={40} />
          <p>{error}</p>
          <button className={styles.retryButton} onClick={fetchRequests}>
            Try Again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyContainer}>
          <AlertCircle size={40} />
          <p>No cancellation requests found</p>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Booking Ref</th>
                  <th>Event</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.booking?.booking_reference || `#${request.booking_id}`}</td>
                    <td>{request.booking?.event_name || 'N/A'}</td>
                    <td>
                      {request.customer 
                        ? `${request.customer.first_name} ${request.customer.last_name}`
                        : 'N/A'}
                    </td>
                    <td>
                      {request.booking?.currency} {request.booking?.total_amount.toFixed(2)}
                    </td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <button
                        className={styles.viewButton}
                        onClick={() => setSelectedRequest(request)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                disabled={!pagination.has_prev}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              >
                Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <button
                className={styles.paginationButton}
                disabled={!pagination.has_next}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedRequest && (
        <CancellationRequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}
    </div>
    </>
  );
};

export default CancellationRequests;
