import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart, 
  Bar
} from 'recharts';
import { 
  CalendarDays, 
  DollarSign,
  Ticket,
  Activity,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardData } from '../types/dashboard';
import Card from '../components/Card';
import Grid from '../components/Grid';
import Stat from '../components/Stat';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  // Format currency
  const formatCurrency = (amount: number): string => {
    return dashboardService.formatCurrency(amount);
  };

  // Get today's date in a readable format
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format date for chart tooltip
  const formatDate = (dateString: string) => {
    return dashboardService.formatChartDate(dateString);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingContainer}>
          <Loader2 size={48} className={styles.spinner} />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} color="var(--color-error)" />
          <h2>Failed to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className={styles.retryButton}>
            <RefreshCw size={20} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.emptyContainer}>
          <AlertCircle size={48} color="var(--color-text-tertiary)" />
          <h2>No Data Available</h2>
          <p>Dashboard data could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.currentDate}>{today}</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={loading}
          className={styles.refreshButton}
          title="Refresh dashboard data"
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      <div className={styles.section}>
        <Grid columns={4} gap="medium">
          <Stat 
            title="Today's Bookings"
            value={dashboardData.statistics.today_bookings}
            icon={<Ticket size={24} />}
            trend={dashboardData.statistics.today_bookings_trend || undefined}
            trendLabel={dashboardData.statistics.today_bookings_trend ? `${dashboardData.statistics.today_bookings_trend > 0 ? '+' : ''}${dashboardData.statistics.today_bookings_trend.toFixed(1)}% from yesterday` : undefined}
            variant="default"
          />
          
          <Stat 
            title="Weekly Bookings"
            value={dashboardData.statistics.week_bookings}
            icon={<Activity size={24} />}
            trend={dashboardData.statistics.week_bookings_trend || undefined}
            variant="success"
          />
          
          <Stat 
            title="Monthly Bookings"
            value={dashboardData.statistics.month_bookings}
            icon={<CalendarDays size={24} />}
            trend={dashboardData.statistics.month_bookings_trend || undefined}
            variant="info"
          />

          <Stat 
            title="Total Revenue"
            value={formatCurrency(dashboardData.statistics.total_revenue)}
            icon={<DollarSign size={24} />}
            trend={dashboardData.statistics.total_revenue_trend || undefined}
            variant="success"
          />
        </Grid>
      </div>

      <div className={styles.section}>
        <Grid columns={2} gap="medium">          <Card title="Bookings Over Time">
            <div className={styles.chartContainer + " slideInUp"}>
              {dashboardData.charts.bookings_over_time.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={dashboardData.charts.bookings_over_time}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                        <stop offset="65%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <filter id="chartShadow" height="130%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="0" dy="3" result="offsetblur" />
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.5" />
                        </feComponentTransfer>
                        <feMerge> 
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" /> 
                        </feMerge>
                      </filter>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="var(--color-text-tertiary)"
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <YAxis 
                      stroke="var(--color-text-tertiary)"
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />                  <Tooltip 
                      formatter={(value: number) => [`${value} bookings`, 'Bookings']}
                      labelFormatter={formatDate}
                      contentStyle={{
                        backgroundColor: 'var(--background-primary)',
                        borderColor: 'var(--color-primary-300)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-colored)',
                        color: 'var(--color-text-primary)'
                      }}
                    />                  <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="var(--color-primary-600)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorBookings)" 
                      name="Bookings"
                      filter="url(#chartShadow)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noDataMessage}>
                  <p>No booking data available for the last 30 days</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Revenue">
            <div className={styles.chartContainer + " slideInUp"}>
              {dashboardData.charts.revenue_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={dashboardData.charts.revenue_trend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.8} />
                        <stop offset="65%" stopColor="var(--color-secondary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                      </linearGradient>
                      <filter id="revenueShadow" height="130%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                        <feOffset dx="0" dy="3" result="offsetblur" />
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.5" />
                        </feComponentTransfer>
                        <feMerge> 
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" /> 
                        </feMerge>
                      </filter>
                    </defs>                  <XAxis 
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />                  <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={formatDate}
                      contentStyle={{
                        backgroundColor: 'var(--background-primary)',
                        borderColor: 'var(--color-secondary-300)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-colored)',
                        color: 'var(--color-text-primary)'
                      }}
                    />                  <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="var(--color-secondary-600)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      name="Revenue"
                      filter="url(#revenueShadow)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noDataMessage}>
                  <p>No revenue data available for the last 30 days</p>
                </div>
              )}
            </div>
          </Card>
        </Grid>
      </div>      <div className={styles.section}>
        <Grid columns={2} gap="medium">          <Card title="Top Events by Booking">
            <div className={styles.chartContainer + " slideInUp"}>
              {dashboardData.charts.top_events.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dashboardData.charts.top_events}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <defs>                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-tertiary)" />
                        <stop offset="100%" stopColor="var(--color-tertiary-700)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--color-text-tertiary)"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <YAxis 
                      stroke="var(--color-text-tertiary)" 
                      tick={{ fill: 'var(--color-text-tertiary)' }}
                    />                  <Tooltip
                      cursor={{fill: 'rgba(180, 180, 180, 0.1)'}}
                      contentStyle={{
                        backgroundColor: 'var(--background-primary)',
                        borderColor: 'var(--color-tertiary-300)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-colored)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                    <Bar 
                      dataKey="bookings" 
                      name="Bookings" 
                      fill="url(#barGradient)" 
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.noDataMessage}>
                  <p>No event data available</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Recent Activities">
            <div className={styles.activitiesList}>
              {dashboardData.recent_activities.length > 0 ? (
                dashboardData.recent_activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={styles.activityItem}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >                  <div className={`${styles.activityIcon} pulse`} style={{
                      background: `${
                        activity.type === 'booking' ? 'var(--color-primary-100)' : 
                        activity.type === 'refund' ? 'var(--color-warning-light)' :
                        activity.type === 'registration' ? 'var(--color-secondary-100)' : 
                        activity.type === 'cancellation' ? 'var(--color-error-light)' : 
                        'var(--color-tertiary-100)'
                      }`,
                      color: `${
                        activity.type === 'booking' ? 'var(--color-primary-600)' : 
                        activity.type === 'refund' ? 'var(--color-warning)' :
                        activity.type === 'registration' ? 'var(--color-secondary-600)' : 
                        activity.type === 'cancellation' ? 'var(--color-error)' : 
                        'var(--color-tertiary-600)'
                      }`
                    }}>{activity.icon || '📋'}</div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>{activity.title}</div>
                      <div className={styles.activityDescription}>{activity.description}</div>
                      <div className={styles.activityTime}>
                        {dashboardService.formatRelativeTime(activity.time)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </Card>
        </Grid>
      </div>
    </div>
  );
};

export default Dashboard;