import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Calendar, Download, FileText, RefreshCw } from 'lucide-react';
import { reportsService } from '../services/reportsService';
import type { 
  ReportFilter, 
  RevenueReportData, 
  BookingsReportData, 
  UserActivityReportData 
} from '../types/reports';
import styles from './Reports.module.css';

// Colors for the pie chart
const COLORS = ['var(--rondo-purple-600)', 'var(--rondo-purple-500)', 'var(--rondo-sky-600)', 'var(--rondo-teal-600)'];

const Reports: React.FC = () => {
  // Get default date range (last 30 days)
  const defaultDateRange = reportsService.getDefaultDateRange();
  
  const [filter, setFilter] = useState<ReportFilter>({
    startDate: defaultDateRange.startDate,
    endDate: defaultDateRange.endDate,
    reportType: 'revenue',
    timeFrame: 'daily',
  });

  const [activeTab, setActiveTab] = useState<'revenue' | 'bookings' | 'users'>('revenue');
  
  // State for report data
  const [revenueData, setRevenueData] = useState<RevenueReportData | null>(null);
  const [bookingsData, setBookingsData] = useState<BookingsReportData | null>(null);
  const [usersData, setUsersData] = useState<UserActivityReportData | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  // Fetch report data based on active tab
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (activeTab) {
        case 'revenue':
          const revData = await reportsService.getRevenueReport(filter);
          console.log('Revenue data received:', revData);
          console.log('Revenue summary:', revData?.summary);
          console.log('Total revenue value:', revData?.summary?.total_revenue);
          setRevenueData(revData);
          break;
        case 'bookings':
          const bookData = await reportsService.getBookingsReport(filter);
          console.log('Bookings data received:', bookData);
          setBookingsData(bookData);
          break;
        case 'users':
          const userData = await reportsService.getUserActivityReport(filter);
          console.log('User activity data received:', userData);
          setUsersData(userData);
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setError(errorMessage);
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when filter changes
  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.startDate, filter.endDate, filter.timeFrame, activeTab]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date for chart tooltip
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Update filter
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  // Handle export
  const handleExportReport = async () => {
    try {
      await reportsService.exportReport(activeTab, filter.startDate, filter.endDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export report';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Render different report content based on active tab
  const renderReportContent = () => {
    switch (activeTab) {
      case 'revenue':
        if (!revenueData) {
          return (
            <div className={styles.noData}>
              <p>Data not available</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                No revenue data for {filter.startDate} to {filter.endDate}
              </p>
            </div>
          );
        }

        // Check if summary data exists
        const hasRevenueSummary = revenueData.summary && typeof revenueData.summary === 'object';
        
        return (
          <>
            <div className={styles.reportSummary}>
              <div className={styles.summaryCard}>
                <h3>Total Revenue</h3>
                <p className={styles.summaryValue}>
                  {hasRevenueSummary 
                    ? formatCurrency(revenueData.summary.total_revenue ?? 0)
                    : 'Data not available'}
                </p>
                {hasRevenueSummary && (
                  <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    From {revenueData.summary.total_bookings ?? 0} bookings
                  </small>
                )}
              </div>
              <div className={styles.summaryCard}>
                <h3>Average Order Value</h3>
                <p className={styles.summaryValue}>
                  {hasRevenueSummary 
                    ? formatCurrency(revenueData.summary.avg_order_value ?? 0)
                    : 'Data not available'}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Refund Rate</h3>
                <p className={styles.summaryValue}>
                  {hasRevenueSummary 
                    ? `${(revenueData.summary.refund_rate ?? 0).toFixed(2)}%`
                    : 'Data not available'}
                </p>
                {hasRevenueSummary && (
                  <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {formatCurrency(revenueData.summary.refunded_amount ?? 0)} refunded
                  </small>
                )}
              </div>
            </div>            <div className={styles.chartContainer}>
              <h3>Revenue Trend ({filter.timeFrame})</h3>
              {revenueData.trend && revenueData.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} className="slideInUp">
                  <AreaChart
                    data={revenueData.trend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--rondo-teal-500)" stopOpacity={0.8} />
                        <stop offset="65%" stopColor="var(--rondo-teal-500)" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="var(--color-text-tertiary)"
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value / 1000}k`}
                      stroke="var(--color-text-tertiary)"
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={formatDate}
                      contentStyle={{
                        backgroundColor: 'var(--background-primary)',
                        borderColor: 'var(--rondo-teal-300)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-colored)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '10px',
                        color: 'var(--color-text-secondary)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="var(--rondo-teal-600)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      name="Revenue"
                      filter="url(#reportShadow)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>
                  <p>No trend data available for the selected period</p>
                </div>
              )}
            </div>

            <div className={styles.chartContainer}>
              <h3>Revenue by Month</h3>
              {revenueData.monthly && revenueData.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={revenueData.monthly}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#1a237e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>
                  <p>No monthly revenue data available</p>
                </div>
              )}
            </div>
          </>
        );
      
      case 'bookings':
        if (!bookingsData) {
          return (
            <div className={styles.noData}>
              <p>Data not available</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                No bookings data for {filter.startDate} to {filter.endDate}
              </p>
            </div>
          );
        }

        // Check if summary data exists
        const hasBookingsSummary = bookingsData.summary && typeof bookingsData.summary === 'object';
        
        return (
          <>
            <div className={styles.reportSummary}>
              <div className={styles.summaryCard}>
                <h3>Total Bookings</h3>
                <p className={styles.summaryValue}>
                  {hasBookingsSummary 
                    ? (bookingsData.summary.total_bookings ?? 0).toLocaleString()
                    : 'Data not available'}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Completed Bookings</h3>
                <p className={styles.summaryValue}>
                  {hasBookingsSummary 
                    ? (bookingsData.summary.completed_bookings ?? 0).toLocaleString()
                    : 'Data not available'}
                </p>
                {hasBookingsSummary && (
                  <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {bookingsData.summary.pending_bookings ?? 0} pending
                  </small>
                )}
              </div>
              <div className={styles.summaryCard}>
                <h3>Cancellation Rate</h3>
                <p className={styles.summaryValue}>
                  {hasBookingsSummary 
                    ? `${(bookingsData.summary.cancellation_rate ?? 0).toFixed(2)}%`
                    : 'Data not available'}
                </p>
                {hasBookingsSummary && (
                  <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {bookingsData.summary.cancelled_bookings ?? 0} cancelled
                  </small>
                )}
              </div>
            </div>

            <div className={styles.chartContainer}>
              <h3>Bookings Trend ({filter.timeFrame})</h3>
              {bookingsData.trend && bookingsData.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={bookingsData.trend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a237e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip 
                      formatter={(value: number) => [`${value} bookings`, 'Bookings']}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1a237e" 
                      fillOpacity={1} 
                      fill="url(#colorBookings)" 
                      name="Bookings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>
                  <p>No bookings trend data available for the selected period</p>
                </div>
              )}
            </div>

            <div className={styles.chartContainer}>
              <h3>Event Performance</h3>
              {bookingsData.event_performance && bookingsData.event_performance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={bookingsData.event_performance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#1a237e" />
                    <YAxis yAxisId="right" orientation="right" stroke="#4caf50" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#1a237e" />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>
                  <p>No event performance data available</p>
                </div>
              )}
            </div>
          </>
        );
      
      case 'users':
        if (!usersData) return <div className={styles.noData}>No user activity data available</div>;
        return (
          <>
            <div className={styles.reportSummary}>
              <div className={styles.summaryCard}>
                <h3>Total Users</h3>
                <p className={styles.summaryValue}>{usersData.summary.total_users.toLocaleString()}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>Active Users</h3>
                <p className={styles.summaryValue}>{usersData.summary.active_users.toLocaleString()}</p>
              </div>
              <div className={styles.summaryCard}>
                <h3>New Users (30d)</h3>
                <p className={styles.summaryValue}>{usersData.summary.new_users_30d.toLocaleString()}</p>
              </div>
            </div>

            <div className={styles.chartSection}>
              <div className={styles.chartContainerHalf}>
                <h3>User Activity</h3>
                {usersData.user_status_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={usersData.user_status_breakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >                      {usersData.user_status_breakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Users']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.noData}>No user activity data</div>
                )}
              </div>

              <div className={styles.chartContainerHalf}>
                <h3>User Booking Frequency</h3>
                {usersData.booking_frequency.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={usersData.booking_frequency}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value, 'Users']} />
                    <Legend />
                    <Bar dataKey="value" name="Users" fill="#3949ab" />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className={styles.noData}>No booking frequency data</div>
                )}
              </div>
            </div>

            <div className={styles.chartContainer}>
              <h3>User Acquisition Trend</h3>
              {usersData.acquisition_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={usersData.acquisition_trend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3949ab" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3949ab" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip 
                    formatter={(value: number) => [`${value} users`, 'New Users']}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3949ab" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                    name="New Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div className={styles.noData}>No acquisition trend data</div>
              )}
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={styles.reportsContainer}>
        <div className={styles.loading}>
          <RefreshCw className={styles.spinner} size={48} />
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.reportsContainer}>
        <div className={styles.error}>
          <h3>Error Loading Report</h3>
          <p>{error}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
            Check the browser console for more details.
          </p>
          <button onClick={fetchReportData} className={styles.retryButton}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportsContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Reports & Analytics</h1>
        <div className={styles.headerActions}>
          <button className={styles.refreshButton} onClick={fetchReportData} title="Refresh data">
            <RefreshCw size={16} />
          </button>
          <button className={styles.exportButton} onClick={handleExportReport}>
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      <div className={styles.filtersSection}>
        <div className={styles.filtersCard}>
          <div className={styles.filterItem}>
            <label htmlFor="reportType">Report Type</label>
            <select
              id="reportType"
              name="reportType"
              value={filter.reportType}
              onChange={(e) => setActiveTab(e.target.value as 'revenue' | 'bookings' | 'users')}
              className={styles.filterSelect}
            >
              <option value="revenue">Revenue Report</option>
              <option value="bookings">Bookings Report</option>
              <option value="users">User Activity Report</option>
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
                value={filter.startDate}
                onChange={handleFilterChange}
                className={styles.dateInput}
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
                value={filter.endDate}
                onChange={handleFilterChange}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.filterItem}>
            <label htmlFor="timeFrame">Time Frame</label>
            <select
              id="timeFrame"
              name="timeFrame"
              value={filter.timeFrame}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button className={styles.generateReportButton}>
            <FileText size={16} /> Generate Report
          </button>
        </div>
      </div>

      <div className={styles.reportsTabs}>
        <button 
          className={`${styles.reportTab} ${activeTab === 'revenue' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Report
        </button>
        <button 
          className={`${styles.reportTab} ${activeTab === 'bookings' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('bookings')}
        >
          Bookings Report
        </button>
        <button 
          className={`${styles.reportTab} ${activeTab === 'users' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('users')}
        >
          User Activity Report
        </button>
      </div>

      <div className={styles.reportContent}>
        {renderReportContent()}
      </div>
    </div>
  );
};

export default Reports;