import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, PauseCircle, Image, ImageIcon, Calendar, Users } from 'lucide-react';
import { teamCredentialsService, type TeamCredentialsStatsData } from '../../services/teamCredentialsService';
import styles from './TeamCredentialsStats.module.css';

interface TeamCredentialsStatsProps {
  refreshTrigger?: number;
}

const TeamCredentialsStats: React.FC<TeamCredentialsStatsProps> = ({ refreshTrigger = 0 }) => {
  const [stats, setStats] = useState<TeamCredentialsStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await teamCredentialsService.getTeamCredentialsStats();
        setStats(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        console.error('Error loading team credentials stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [refreshTrigger]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!stats) {
    return <div className={styles.empty}>No data</div>;
  }

  const statItems = [
    {
      label: 'Total',
      value: stats.total_credentials,
      color: 'primary',
      icon: <Trophy size={14} />
    },
    {
      label: 'Active',
      value: stats.active_credentials,
      color: 'success',
      icon: <CheckCircle size={14} />
    },
    {
      label: 'Inactive',
      value: stats.inactive_credentials,
      color: 'secondary',
      icon: <PauseCircle size={14} />
    },
    {
      label: 'With Logo',
      value: stats.with_logo,
      color: 'info',
      icon: <Image size={14} />
    },
    {
      label: 'With Banner',
      value: stats.with_banner,
      color: 'info',
      icon: <ImageIcon size={14} />
    },
    {
      label: 'Tournaments',
      value: stats.unique_tournaments,
      color: 'warning',
      icon: <Calendar size={14} />
    },
    {
      label: 'Teams',
      value: stats.unique_teams,
      color: 'warning',
      icon: <Users size={14} />
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {statItems.map((item) => (
        <div key={item.label} className={`${styles.statItem} ${styles[item.color]}`}>
          <div className={styles.statIcon}>{item.icon}</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{item.value}</div>
            <div className={styles.statLabel}>{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamCredentialsStats;