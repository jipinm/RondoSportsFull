import React from 'react';
import type { Banner } from '../../types/banners';
import styles from './BannerCard.module.css';

interface BannerCardProps {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number) => void;
  // Drag and drop props
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, banner: Banner) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, banner: Banner) => void;
}

export const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  onEdit,
  onDelete,
  onToggleStatus,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatEventDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      
      // Add ordinal suffix (st, nd, rd, th)
      const getOrdinalSuffix = (n: number): string => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
      };
      
      return `${dayName}, ${monthName} ${day}${getOrdinalSuffix(day)}`;
    } catch (error) {
      console.error('Error formatting event date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div 
      className={`${styles.bannerCard} ${isDragging ? styles.dragging : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, banner)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, banner)}
    >
      <div className={styles.dragHandle} title="Drag to reorder">
        <span className={styles.dragIcon}>⋮⋮</span>
        <span className={styles.positionBadge}>#{banner.position_order + 1}</span>
      </div>
      <div className={styles.bannerHeader}>
        <div className={styles.bannerInfo}>
          <h3 className={styles.bannerTitle}>{banner.title}</h3>
          <p className={styles.bannerDescription}>{banner.description}</p>
        </div>
        <div className={styles.bannerStatus}>
          <span 
            className={styles.statusBadge}
            style={{ backgroundColor: getStatusColor(banner.status) }}
          >
            {banner.status}
          </span>
        </div>
      </div>

      {banner.image_url && (
        <div className={styles.bannerImageContainer}>
          <img 
            src={banner.image_url} 
            alt={banner.title}
            className={styles.bannerImage}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className={styles.bannerDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Location:</span>
          <span className={styles.detailValue}>{banner.location || 'All'}</span>
        </div>

        {banner.link_url && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Link:</span>
            <a 
              href={banner.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.bannerLink}
            >
              {banner.link_url.length > 40 
                ? `${banner.link_url.substring(0, 40)}...` 
                : banner.link_url}
            </a>
          </div>
        )}

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Event Date:</span>
          <span className={styles.detailValue}>
            {banner.event_date ? formatEventDate(banner.event_date) : 'Not set'}
          </span>
        </div>
      </div>

      <div className={styles.bannerActions}>
        <button
          onClick={() => onEdit(banner)}
          className={`${styles.actionButton} ${styles.editButton}`}
          title="Edit Banner"
        >
          ✏️ Edit
        </button>
        
        <button
          onClick={() => onToggleStatus(banner.id)}
          className={`${styles.actionButton} ${styles.toggleButton}`}
          title={banner.status === 'active' ? 'Deactivate' : 'Activate'}
        >
          {banner.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
        </button>
        
        <button
          onClick={() => onDelete(banner.id)}
          className={`${styles.actionButton} ${styles.deleteButton}`}
          title="Delete Banner"
        >
          🗑️ Delete
        </button>
      </div>

      <div className={styles.bannerMeta}>
        <small className={styles.metaText}>
          Created: {formatDate(banner.created_at)} | 
          Updated: {formatDate(banner.updated_at)}
        </small>
      </div>
    </div>
  );
};