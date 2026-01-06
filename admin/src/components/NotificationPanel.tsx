import React from 'react';
import { Bell, X, Circle, CheckCircle } from 'lucide-react';
import styles from './NotificationPanel.module.css';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const unreadCount = notifications.filter(notification => !notification.isRead).length;
  
  return (
    <div className={styles.notificationPanelContainer}>
      <div className={styles.notificationPanel}>        <div className={styles.notificationHeader}>
          <div className={styles.notificationTitle}>
            <Bell size={18} />
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className={styles.notificationCount}>{unreadCount}</span>
            )}
          </div>
          <div className={styles.notificationActions}>
            <button 
              className={styles.markAllButton}
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
          <div className={styles.notificationList}>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className={`${styles.notificationIcon} ${styles[notification.type]}`}>
                  {notification.isRead ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </div>                <div className={styles.notificationContent}>
                  <h4>{notification.title}</h4>
                  <p className={styles.notificationMessage}>{notification.message}</p>
                  <span className={styles.notificationTime}>{notification.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Bell size={40} strokeWidth={1} className={styles.emptyIcon} />
              <p>No new notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
