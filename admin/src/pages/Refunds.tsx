import React, { useState, useEffect } from 'react';
import { Calendar, X, CheckCircle, XCircle, Eye, Loader } from 'lucide-react';
import { refundService } from '../services/refund-service';
import type { RefundRequest, RefundFilters } from '../services/refund-service';
import styles from './Refunds.module.css';

interface RefundDetailsModalProps {
  refund: RefundRequest;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: RefundRequest['status'], adminNotes?: string, rejectionReason?: string) => void;
}

const RefundDetailsModal: React.FC<RefundDetailsModalProps> = ({ refund, onClose, onStatusChange }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = () => {
    onStatusChange(refund.id, 'approved', adminNotes);
    onClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    onStatusChange(refund.id, 'rejected', adminNotes, rejectionReason);
    onClose();
  };

  const handleRejectClick = () => {
    setShowRejectForm(true);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Refund Request Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.refundInfoGrid}>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Refund ID:</span>
              <span className={styles.refundInfoValue}>{refund.id}</span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Booking ID:</span>
              <span className={styles.refundInfoValue}>{refund.bookingId}</span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Customer:</span>
              <span className={styles.refundInfoValue}>{refund.user.name}</span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Email:</span>
              <span className={styles.refundInfoValue}>{refund.user.email}</span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Amount:</span>
              <span className={styles.refundInfoValue}>{formatCurrency(refund.amount)}</span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Status:</span>
              <span className={`${styles.refundStatus} ${styles[refund.status]}`}>
                {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
              </span>
            </div>
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Request Date:</span>
              <span className={styles.refundInfoValue}>{formatDate(refund.requestDate)}</span>
            </div>
          </div>
          
          <div className={styles.reasonSection}>
            <h3 className={styles.sectionTitle}>Refund Reason</h3>
            <p className={styles.reasonText}>{refund.reason.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
          </div>

          {/* Additional refund details */}
          {refund.refundReference && (
            <div className={styles.refundInfoItem}>
              <span className={styles.refundInfoLabel}>Refund Reference:</span>
              <span className={styles.refundInfoValue}>{refund.refundReference}</span>
            </div>
          )}

          {refund.adminNotes && (
            <div className={styles.reasonSection}>
              <h3 className={styles.sectionTitle}>Admin Notes</h3>
              <p className={styles.reasonText}>{refund.adminNotes}</p>
            </div>
          )}

          {refund.rejectionReason && (
            <div className={styles.reasonSection}>
              <h3 className={styles.sectionTitle}>Rejection Reason</h3>
              <p className={styles.reasonText}>{refund.rejectionReason}</p>
            </div>
          )}

          {/* Admin action forms */}
          {refund.status === 'pending' && (
            <div className={styles.adminActionsSection}>
              <div className={styles.adminNotesInput}>
                <label htmlFor="adminNotes" className={styles.inputLabel}>Admin Notes</label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this refund decision..."
                  className={styles.textArea}
                />
              </div>

              {showRejectForm && (
                <div className={styles.rejectionReasonInput}>
                  <label htmlFor="rejectionReason" className={styles.inputLabel}>Rejection Reason *</label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this refund is being rejected..."
                    className={styles.textArea}
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>Close</button>
          {refund.status === 'pending' && (
            <>
              {!showRejectForm ? (
                <>
                  <button className={styles.rejectButton} onClick={handleRejectClick}>Reject Refund</button>
                  <button className={styles.approveButton} onClick={handleApprove}>Approve Refund</button>
                </>
              ) : (
                <>
                  <button className={styles.secondaryButton} onClick={() => setShowRejectForm(false)}>Cancel</button>
                  <button className={styles.rejectButton} onClick={handleReject}>Confirm Rejection</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Refunds: React.FC = () => {
  const [refundsList, setRefundsList] = useState<RefundRequest[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const itemsPerPage = 10;

  // Load refunds on component mount
  useEffect(() => {
    loadRefunds();
  }, []);

  // Reload refunds when filters change
  useEffect(() => {
    const filters: RefundFilters = {
      page: currentPage,
      per_page: itemsPerPage,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    };
    loadRefunds(filters);
  }, [currentPage, searchTerm, statusFilter, startDate, endDate]);

  const loadRefunds = async (filters: RefundFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await refundService.getRefunds({
        page: currentPage,
        per_page: itemsPerPage,
        ...filters
      });
      setRefundsList(response.refunds);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (err) {
      console.error('Error loading refunds:', err);
      setError('Failed to load refunds. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatReason = (reason: string) => {
    return reason.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };
  
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
    setCurrentPage(1);
  };

  const handleStatusChange = async (id: string, newStatus: RefundRequest['status'], adminNotes?: string, rejectionReason?: string) => {
    try {
      await refundService.updateRefundStatus(id, {
        status: newStatus,
        admin_notes: adminNotes,
        rejection_reason: rejectionReason
      });
      
      // Refresh the refund list
      await loadRefunds();
      
      // Close modal if open
      setSelectedRefund(null);
    } catch (err) {
      console.error('Error updating refund status:', err);
      setError('Failed to update refund status. Please try again.');
    }
  };
  
  // Use refundsList directly since filtering is handled by API
  const paginatedRefunds = refundsList;
  
  // Total pages will be tracked by API response
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalItems] = useState(0);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={styles.refundsContainer}>
      <h1 className={styles.pageTitle}>Refunds</h1>
        <div className={styles.filtersContainer}>
        <div className={styles.filterItem}>
          <label htmlFor="searchInput">Search</label>
          <div className={styles.searchBox}>
            <input
              id="searchInput"
              type="text"
              placeholder="Search refunds..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
          <div className={styles.filterItem}>
          <label htmlFor="statusFilter">Status</label>
          <select 
            id="statusFilter"
            className={styles.filterSelect} 
            value={statusFilter} 
            onChange={handleStatusFilterChange}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processed">Processed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
          <div className={styles.filterItem}>
          <label htmlFor="startDate">Start Date</label>
          <div className={styles.dateInputWrapper}>
            <Calendar size={16} className={styles.dateIcon} />
            <input
              type="date"
              id="startDate"
              name="startDate"
              className={styles.dateInput}
              value={startDate}
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
        
        <div className={styles.filterItem}>
          <label htmlFor="endDate">End Date</label>
          <div className={styles.dateInputWrapper}>
            <Calendar size={16} className={styles.dateIcon} />
            <input
              type="date"
              id="endDate"
              name="endDate"
              className={styles.dateInput}
              value={endDate}
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.refundsTable}>
          <thead>
            <tr>
              <th>Refund ID</th>
              <th>Booking ID</th>
              <th>User</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.loadingCell}>
                  <Loader size={20} className={styles.spinner} />
                  Loading refunds...
                </td>
              </tr>
            ) : paginatedRefunds.length > 0 ? (
              paginatedRefunds.map((refund) => (
                <tr key={refund.id}>
                  <td>{refund.id}</td>
                  <td>{refund.bookingId}</td>
                  <td>{refund.user.name}</td>
                  <td>{formatCurrency(refund.amount)}</td>
                  <td className={styles.reasonCell}>
                    {formatReason(refund.reason).length > 30 
                      ? `${formatReason(refund.reason).substring(0, 30)}...` 
                      : formatReason(refund.reason)}
                  </td>
                  <td>{formatDate(refund.requestDate)}</td>
                  <td>
                    <span className={`${styles.refundStatus} ${styles[refund.status]}`}>
                      {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.viewButton}
                        onClick={() => setSelectedRefund(refund)}
                      >
                        <Eye size={16} /> View
                      </button>
                      
                      {refund.status === 'pending' && (
                        <>
                          <button 
                            className={styles.rejectButton}
                            onClick={() => handleStatusChange(refund.id, 'rejected', '', 'Quick rejection from table')}
                          >
                            <XCircle size={16} /> Reject
                          </button>
                          <button 
                            className={styles.approveButton}
                            onClick={() => handleStatusChange(refund.id, 'approved', 'Quick approval from table')}
                          >
                            <CheckCircle size={16} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.noResults}>
                  No refund requests found matching your filters
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
      
      {selectedRefund && (
        <RefundDetailsModal
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default Refunds;