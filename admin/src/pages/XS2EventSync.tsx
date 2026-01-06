import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { bookingService } from '../services/booking-service';
import type { Booking } from '../services/booking-service';
import styles from './XS2EventSync.module.css';

interface SyncResult {
  bookingId: string;
  success: boolean;
  message: string;
  error?: string;
}

const XS2EventSync: React.FC = () => {
  const [unsyncedBookings, setUnsyncedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnsyncedBookings();
  }, []);

  const fetchUnsyncedBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const bookings = await bookingService.getUnsyncedBookings();
      setUnsyncedBookings(bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load unsynced bookings');
      console.error('Error fetching unsynced bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedBookings.size === unsyncedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(unsyncedBookings.map(b => b.id)));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleSyncSelected = async () => {
    if (selectedBookings.size === 0) {
      alert('Please select at least one booking to sync');
      return;
    }

    if (!confirm(`Are you sure you want to sync ${selectedBookings.size} booking(s) with XS2Event?`)) {
      return;
    }

    setSyncing(true);
    setSyncResults([]);
    const results: SyncResult[] = [];

    for (const bookingId of Array.from(selectedBookings)) {
      try {
        const result = await bookingService.syncWithXS2Event(bookingId);
        results.push({
          bookingId,
          success: result.success,
          message: result.message,
        });
      } catch (err) {
        results.push({
          bookingId,
          success: false,
          message: 'Sync failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setSyncResults(results);
    setSyncing(false);

    // Refresh the list of unsynced bookings
    await fetchUnsyncedBookings();
    
    // Clear selection
    setSelectedBookings(new Set());

    // Show summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    alert(
      `Sync Complete!\n\n` +
      `✅ Successful: ${successCount}\n` +
      `❌ Failed: ${failCount}`
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 size={40} className={styles.spinner} />
          <p>Loading unsynced bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={40} color="#c62828" />
          <h2>Error Loading Bookings</h2>
          <p>{error}</p>
          <button onClick={fetchUnsyncedBookings} className={styles.retryButton}>
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>XS2Event Sync Tool</h1>
          <p className={styles.subtitle}>
            Manage bookings that haven't been synced with XS2Event API
          </p>
        </div>
        <button onClick={fetchUnsyncedBookings} className={styles.refreshButton} disabled={syncing}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {unsyncedBookings.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={60} color="#2e7d32" />
          <h2>All Synced!</h2>
          <p>All confirmed bookings have been successfully synced with XS2Event.</p>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.selectionInfo}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedBookings.size === unsyncedBookings.length && unsyncedBookings.length > 0}
                  onChange={handleSelectAll}
                  className={styles.checkbox}
                />
                <span>
                  {selectedBookings.size === 0
                    ? `${unsyncedBookings.length} unsynced booking${unsyncedBookings.length !== 1 ? 's' : ''}`
                    : `${selectedBookings.size} selected`}
                </span>
              </label>
            </div>

            <button
              onClick={handleSyncSelected}
              disabled={selectedBookings.size === 0 || syncing}
              className={styles.syncButton}
            >
              {syncing ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Sync Selected ({selectedBookings.size})
                </>
              )}
            </button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.bookingsTable}>
              <thead>
                <tr>
                  <th className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={selectedBookings.size === unsyncedBookings.length && unsyncedBookings.length > 0}
                      onChange={handleSelectAll}
                      className={styles.checkbox}
                    />
                  </th>
                  <th>Booking ID</th>
                  <th>Event Name</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Booking Date</th>
                  <th>Sync Attempts</th>
                  <th>Last Error</th>
                </tr>
              </thead>
              <tbody>
                {unsyncedBookings.map((booking) => (
                  <tr key={booking.id} className={selectedBookings.has(booking.id) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectedBookings.has(booking.id)}
                        onChange={() => handleSelectBooking(booking.id)}
                        className={styles.checkbox}
                      />
                    </td>
                    <td className={styles.bookingId}>{booking.id}</td>
                    <td>{booking.event_name}</td>
                    <td>{booking.user.name}</td>
                    <td>{formatCurrency(booking.total_amount)}</td>
                    <td>
                      <span className={`${styles.status} ${styles[booking.status]}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td>{formatDate(booking.booking_date)}</td>
                    <td>
                      {booking.xs2event_sync_attempts ? (
                        <span className={styles.attempts}>
                          🔄 {booking.xs2event_sync_attempts}
                        </span>
                      ) : (
                        <span className={styles.noAttempts}>0</span>
                      )}
                    </td>
                    <td>
                      {booking.xs2event_last_error ? (
                        <span className={styles.error} title={booking.xs2event_last_error}>
                          {booking.xs2event_last_error.substring(0, 30)}...
                        </span>
                      ) : (
                        <span className={styles.noError}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {syncResults.length > 0 && (
            <div className={styles.resultsContainer}>
              <h3 className={styles.resultsTitle}>Sync Results</h3>
              <div className={styles.resultsList}>
                {syncResults.map((result, index) => (
                  <div
                    key={index}
                    className={`${styles.resultItem} ${result.success ? styles.success : styles.failed}`}
                  >
                    {result.success ? (
                      <CheckCircle size={16} color="#2e7d32" />
                    ) : (
                      <XCircle size={16} color="#c62828" />
                    )}
                    <span className={styles.resultBookingId}>Booking {result.bookingId}:</span>
                    <span className={styles.resultMessage}>
                      {result.success ? result.message : result.error || result.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default XS2EventSync;
