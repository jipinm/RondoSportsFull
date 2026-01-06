import React, { useState, useEffect } from 'react';
import { Filter, Download, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Table from '../components/Table';
import Card from '../components/Card';
import BlockCustomerModal from '../components/BlockCustomerModal';
import styles from './CustomerManagement.module.css';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  status: 'active' | 'blocked' | 'pending_verification' | 'pending';
  email_verified: boolean;
  marketing_consent: boolean;
  created_at: string;
  last_activity: string;
  total_bookings: number;
  total_spent: number;
}

const CustomerManagement: React.FC = () => {
  const { user, checkPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [customerToBlock, setCustomerToBlock] = useState<Customer | null>(null);
  const [blockingInProgress, setBlockingInProgress] = useState(false);

  // Check if user has permission to manage customers
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const canManageCustomers = isSuperAdmin || isAdmin || (checkPermission ? checkPermission('customers.manage') : false);
  const canViewCustomers = isSuperAdmin || isAdmin || (checkPermission ? checkPermission('customers.view') : false);

  useEffect(() => {
    if (!canViewCustomers) {
      setError('You do not have permission to view customers');
      setLoading(false);
      return;
    }
    fetchCustomers();
  }, [currentPage, searchTerm, statusFilter, canViewCustomers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/customers?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }

      const data = await response.json();
      setCustomers(data.data?.customers || data.customers || []);
      setTotalPages(Math.ceil((data.pagination?.total_items || data.data?.total || 0) / 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (customerId: string, newStatus: 'active' | 'blocked') => {
    if (!canManageCustomers) {
      alert('You do not have permission to modify customer status');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      alert('Customer not found');
      return;
    }

    // If blocking customer, show modal for reason
    if (newStatus === 'blocked') {
      setCustomerToBlock(customer);
      setShowBlockModal(true);
      return;
    }

    // For activating customer, proceed directly
    await updateCustomerStatus(customerId, newStatus);
  };

  const updateCustomerStatus = async (customerId: string, newStatus: 'active' | 'blocked', reason?: string) => {
    try {
      setBlockingInProgress(true);
      
      const requestBody: any = { status: newStatus };
      if (reason) {
        requestBody.reason = reason;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/customers/${customerId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || response.statusText;
        throw new Error(`Failed to update customer status: ${errorMessage}`);
      }

      // Refresh the customer list
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update customer status');
      console.error('Error updating customer status:', err);
    } finally {
      setBlockingInProgress(false);
    }
  };

  const handleBlockConfirm = async (reason: string) => {
    if (customerToBlock) {
      await updateCustomerStatus(customerToBlock.id, 'blocked', reason);
      setShowBlockModal(false);
      setCustomerToBlock(null);
    }
  };

  const handleBlockCancel = () => {
    setShowBlockModal(false);
    setCustomerToBlock(null);
  };

  const exportCustomers = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/customers/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export customers: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export customers');
      console.error('Error exporting customers:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: styles.statusActive,
      blocked: styles.statusDisabled,
      pending_verification: styles.statusPending,
      pending: styles.statusPending
    };

    // Format display text
    const displayText = {
      active: 'Active',
      blocked: 'Blocked',
      pending_verification: 'Pending',
      pending: 'Pending'
    };

    return (
      <span className={`${styles.statusBadge} ${statusClasses[status as keyof typeof statusClasses] || styles.statusPending}`}>
        {displayText[status as keyof typeof displayText] || status.charAt(0).toUpperCase() + status.slice(1)}
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

  if (!canViewCustomers) {
    return (
      <div className={styles.container}>
        <Card className={styles.errorCard}>
          <div className={styles.errorContent}>
            <AlertTriangle size={48} className={styles.errorIcon} />
            <h2>Access Denied</h2>
            <p>You do not have permission to view customer management.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Customer Management</h1>
          <p className={styles.subtitle}>Manage and monitor customer accounts</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={exportCustomers}>
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <Filter size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="pending_verification">Pending Verification</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customer Table */}
      <Card>
        {error ? (
          <div className={styles.errorMessage}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className={styles.loadingMessage}>
            Loading customers...
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <Table>
              <Table.Head>
                <Table.Row isHeader>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Email</Table.HeaderCell>
                  <Table.HeaderCell>Phone</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Joined</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {customers.map(customer => (
                  <Table.Row key={customer.id}>
                    <Table.Cell>
                      <div className={styles.customerInfo}>
                        <div className={styles.customerName}>
                          {`${customer.first_name} ${customer.last_name}`.trim()}
                        </div>
                        <div className={styles.customerMeta}>
                          {customer.email_verified ? '✅ Verified' : '⚠️ Unverified'}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{customer.email}</Table.Cell>
                    <Table.Cell>{customer.phone}</Table.Cell>
                    <Table.Cell>{getStatusBadge(customer.status)}</Table.Cell>
                    <Table.Cell>{formatDate(customer.created_at)}</Table.Cell>
                    <Table.Cell>
                      <div className={styles.actions}>
                        {canManageCustomers && customer.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(customer.id, 'blocked')}
                            title="Block Customer"
                            className={styles.disableButton}
                          >
                            <UserX size={16} />
                          </Button>
                        )}
                        {canManageCustomers && customer.status === 'blocked' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(customer.id, 'active')}
                            title="Activate Customer"
                            className={styles.enableButton}
                          >
                            <UserCheck size={16} />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className={styles.pagination}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Block Customer Modal */}
      <BlockCustomerModal
        isOpen={showBlockModal}
        onClose={handleBlockCancel}
        onConfirm={handleBlockConfirm}
        customerName={customerToBlock ? `${customerToBlock.first_name} ${customerToBlock.last_name}`.trim() : ''}
        loading={blockingInProgress}
      />
    </div>
  );
};

export default CustomerManagement;