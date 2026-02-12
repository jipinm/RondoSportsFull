import React, { useState, useEffect, useCallback } from 'react';
import { 
  Coins, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Search,
  Star,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  Check
} from 'lucide-react';
import Button from '../components/Button';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import { currencyService, type Currency, type CurrencyCreate, type CurrencyUpdate } from '../services/currencyService';
import type { CurrencyStats } from '../types/currencies';
import styles from './CurrencyManagement.module.css';

const CurrencyManagement: React.FC = () => {
  // State
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<CurrencyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Supported currencies from Frankfurter API
  const [supportedCurrencies, setSupportedCurrencies] = useState<Record<string, string>>({});
  const [loadingSupportedCurrencies, setLoadingSupportedCurrencies] = useState(false);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState<CurrencyCreate>({
    code: '',
    name: '',
    symbol: '',
    is_active: true,
    is_default: false,
    sort_order: 0
  });

  const { toasts, closeToast, success, error } = useToast();

  // Fetch currencies
  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.is_active = statusFilter;

      const response = await currencyService.getCurrencies(filters, currentPage, 20);
      setCurrencies(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
      error('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, error]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await currencyService.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
    fetchStats();
    // Fetch supported currencies from Frankfurter API
    setLoadingSupportedCurrencies(true);
    currencyService.getSupportedCurrencies()
      .then(data => setSupportedCurrencies(data))
      .catch(err => {
        console.error('Failed to fetch supported currencies:', err);
        error('Failed to load supported currencies from Frankfurter API');
      })
      .finally(() => setLoadingSupportedCurrencies(false));
  }, [fetchCurrencies, fetchStats]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrencies();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      symbol: '',
      is_active: true,
      is_default: false,
      sort_order: 0
    });
    setEditingCurrency(null);
  };

  // Open modal for create
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      is_active: currency.is_active,
      is_default: currency.is_default,
      sort_order: currency.sort_order
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle currency code selection from dropdown — auto-populate name
  const handleCurrencyCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = supportedCurrencies[code] || '';
    setFormData(prev => ({
      ...prev,
      code,
      name
    }));
  };

  // Get available currencies for the dropdown (supported minus already added, except current when editing)
  const getAvailableCurrencies = (): { code: string; name: string }[] => {
    const existingCodes = new Set(
      currencies
        .filter(c => !editingCurrency || c.id !== editingCurrency.id)
        .map(c => c.code.toUpperCase())
    );

    return Object.entries(supportedCurrencies)
      .filter(([code]) => !existingCodes.has(code.toUpperCase()))
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate currency code is supported
    if (!supportedCurrencies[formData.code]) {
      error('Selected currency is not supported by the Frankfurter API');
      return;
    }

    // Validate no duplicate (for new currencies, or if code changed during edit)
    if (!editingCurrency || editingCurrency.code !== formData.code) {
      const duplicate = currencies.find(c => c.code.toUpperCase() === formData.code.toUpperCase());
      if (duplicate) {
        error(`Currency ${formData.code} already exists`);
        return;
      }
    }

    setSaving(true);

    try {
      if (editingCurrency) {
        // Update existing currency
        const updateData: CurrencyUpdate = { ...formData };
        await currencyService.updateCurrency(editingCurrency.id, updateData);
        success(`Currency ${formData.code} updated successfully`);
      } else {
        // Create new currency
        await currencyService.createCurrency(formData);
        success(`Currency ${formData.code} created successfully`);
      }

      closeModal();
      fetchCurrencies();
      fetchStats();
    } catch (err: any) {
      console.error('Failed to save currency:', err);
      error(err.message || 'Failed to save currency');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (currency: Currency) => {
    if (currency.is_default) {
      error('Cannot delete the default currency');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${currency.code} (${currency.name})?`)) {
      return;
    }

    try {
      await currencyService.deleteCurrency(currency.id);
      success(`Currency ${currency.code} deleted successfully`);
      fetchCurrencies();
      fetchStats();
    } catch (err: any) {
      console.error('Failed to delete currency:', err);
      error(err.message || 'Failed to delete currency');
    }
  };

  // Handle set as default
  const handleSetDefault = async (currency: Currency) => {
    if (currency.is_default) {
      return;
    }

    try {
      await currencyService.setAsDefault(currency.id);
      success(`${currency.code} is now the default currency`);
      fetchCurrencies();
    } catch (err: any) {
      console.error('Failed to set default currency:', err);
      error(err.message || 'Failed to set default currency');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (currency: Currency) => {
    if (currency.is_default && currency.is_active) {
      error('Cannot deactivate the default currency');
      return;
    }

    try {
      const updated = await currencyService.toggleActive(currency.id);
      success(`${currency.code} is now ${updated.is_active ? 'active' : 'inactive'}`);
      fetchCurrencies();
      fetchStats();
    } catch (err: any) {
      console.error('Failed to toggle currency status:', err);
      error(err.message || 'Failed to toggle currency status');
    }
  };

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Coins size={28} />
          Currency Management
        </h1>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => { fetchCurrencies(); fetchStats(); }}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Currency
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.total}`}>
            <Coins size={24} />
          </div>
          <div className={styles.statContent}>
            <h4>Total Currencies</h4>
            <p>{stats?.total_currencies || 0}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.active}`}>
            <Check size={24} />
          </div>
          <div className={styles.statContent}>
            <h4>Active</h4>
            <p>{stats?.active_currencies || 0}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.inactive}`}>
            <X size={24} />
          </div>
          <div className={styles.statContent}>
            <h4>Inactive</h4>
            <p>{stats?.inactive_currencies || 0}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search currencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        ) : currencies.length === 0 ? (
          <div className={styles.emptyState}>
            <Coins size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No currencies found</h3>
            <p>Create your first currency to get started.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Symbol</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr key={currency.id}>
                  <td>
                    <span className={styles.currencyCode}>{currency.code}</span>
                  </td>
                  <td>
                    {currency.name}
                    {!!currency.is_default && (
                      <span className={`${styles.badge} ${styles.default}`}>
                        <Star size={12} style={{ marginRight: '0.25rem' }} />
                        Default
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.currencySymbol}>{currency.symbol}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${currency.is_active ? styles.active : styles.inactive}`}>
                      {currency.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{currency.sort_order}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={`${styles.actionBtn} ${styles.toggle}`}
                        onClick={() => handleToggleActive(currency)}
                        title={currency.is_active ? 'Deactivate' : 'Activate'}
                        disabled={currency.is_default && currency.is_active}
                      >
                        {currency.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.default}`}
                        onClick={() => handleSetDefault(currency)}
                        title="Set as default"
                        disabled={currency.is_default}
                      >
                        <Star size={18} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.edit}`}
                        onClick={() => openEditModal(currency)}
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.delete}`}
                        onClick={() => handleDelete(currency)}
                        title="Delete"
                        disabled={currency.is_default}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={styles.paginationBtn}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCurrency ? 'Edit Currency' : 'Add Currency'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="code">Currency Code *</label>
                    {loadingSupportedCurrencies ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                        <Loader2 size={16} className={styles.spinner} />
                        <span>Loading currencies...</span>
                      </div>
                    ) : (
                      <select
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleCurrencyCodeChange}
                        required
                        disabled={!!editingCurrency}
                      >
                        <option value="">Select a currency...</option>
                        {editingCurrency && (
                          <option value={editingCurrency.code}>
                            {editingCurrency.code} — {supportedCurrencies[editingCurrency.code] || editingCurrency.name}
                          </option>
                        )}
                        {getAvailableCurrencies().map(({ code, name }) => (
                          <option key={code} value={code}>
                            {code} — {name}
                          </option>
                        ))}
                      </select>
                    )}
                    <small>Only currencies supported by Frankfurter API</small>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="symbol">Symbol *</label>
                    <input
                      type="text"
                      id="symbol"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      placeholder="$"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="name">Currency Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="US Dollar"
                    required
                  />
                  <small>Auto-filled from Frankfurter API — editable</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="sort_order">Sort Order</label>
                  <input
                    type="number"
                    id="sort_order"
                    name="sort_order"
                    value={formData.sort_order || 0}
                    onChange={handleInputChange}
                    min={0}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingCurrency ? 'Update' : 'Create'} Currency
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyManagement;
