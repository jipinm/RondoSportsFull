import React from 'react';
import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import styles from './Stat.module.css';

interface StatProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number; // Positive for up, negative for down, undefined for no trend
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const Stat: React.FC<StatProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className = '',
}) => {
  const renderTrendIcon = () => {
    if (trend === undefined) return <ArrowRight size={16} />;
    return trend > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  const getTrendClass = () => {
    if (trend === undefined) return styles.neutral;
    return trend > 0 ? styles.positive : styles.negative;
  };    // Set CSS variables for dynamic colors based on variant
  const getStyle = (): React.CSSProperties => {
    const styleMap: Record<string, React.CSSProperties> = {
      'default': {
        '--icon-bg': 'var(--color-secondary-100)',
        '--icon-color': 'var(--color-secondary-600)'
      } as React.CSSProperties,
      'success': {
        '--icon-bg': 'var(--color-primary-100)',
        '--icon-color': 'var(--color-primary-600)'
      } as React.CSSProperties,
      'warning': {
        '--icon-bg': 'var(--color-warning-light)',
        '--icon-color': 'var(--color-warning)'
      } as React.CSSProperties,
      'danger': {
        '--icon-bg': 'var(--color-error-light)',
        '--icon-color': 'var(--color-error)'
      } as React.CSSProperties,
      'info': {
        '--icon-bg': 'var(--color-tertiary-100)',
        '--icon-color': 'var(--color-tertiary-600)'
      } as React.CSSProperties
    };
    
    return styleMap[variant as keyof typeof styleMap];
  };

  return (
    <div className={`${styles.stat} ${styles[variant]} ${className} fadeIn`} style={getStyle()}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.value}>{value}</div>
        {(trend !== undefined || trendLabel) && (
          <div className={`${styles.trend} ${getTrendClass()}`}>
            {renderTrendIcon()}
            <span>{trendLabel || `${Math.abs(trend || 0)}%`}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stat;
