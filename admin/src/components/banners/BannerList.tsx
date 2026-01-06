import React, { useState, useEffect } from 'react';
import type { Banner } from '../../types/banners';
import { BannerCard } from './BannerCard';
import { BannerForm } from './BannerForm';
import { bannersService } from '../../services/bannersService';
import { useToast } from '../../hooks/useToast';
import ToastContainer from '../ToastContainer';
import styles from './BannerList.module.css';

interface BannerListProps {
  refreshTrigger?: number;
}

type BannerLocation = 'homepage_hero' | 'homepage_secondary' | 'category_page' | 'event_page';

const LOCATION_LABELS: Record<BannerLocation, string> = {
  homepage_hero: '🏠 Homepage Hero Banners',
  homepage_secondary: '📌 Homepage Secondary Banners',
  category_page: '📁 Category Page Banners',
  event_page: '🎫 Event Page Banners'
};

export const BannerList: React.FC<BannerListProps> = ({ refreshTrigger }) => {
  const [bannersByLocation, setBannersByLocation] = useState<Record<BannerLocation, Banner[]>>({
    homepage_hero: [],
    homepage_secondary: [],
    category_page: [],
    event_page: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  
  // Toast notifications
  const toast = useToast();
  
  // Drag and drop state - per location
  const [draggedBanner, setDraggedBanner] = useState<{ banner: Banner; location: BannerLocation } | null>(null);
  const [savingPositions, setSavingPositions] = useState<BannerLocation | null>(null);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all banners without pagination
      const response = await bannersService.getBanners({}, 1, 1000);
      
      // Group banners by location
      const grouped: Record<BannerLocation, Banner[]> = {
        homepage_hero: [],
        homepage_secondary: [],
        category_page: [],
        event_page: []
      };

      response.data.forEach(banner => {
        const location = banner.location as BannerLocation;
        if (grouped[location]) {
          grouped[location].push(banner);
        }
      });

      // Sort each group by position_order
      Object.keys(grouped).forEach(location => {
        grouped[location as BannerLocation].sort((a, b) => a.position_order - b.position_order);
      });

      setBannersByLocation(grouped);
    } catch (err: any) {
      setError(err.message || 'Failed to load banners');
      console.error('Error loading banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [refreshTrigger]);

  const handleCreateBanner = () => {
    setEditingBanner(undefined);
    setShowForm(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setShowForm(true);
  };

  const handleDeleteBanner = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      await bannersService.deleteBanner(id);
      toast.success('Banner deleted successfully');
      await loadBanners();
    } catch (err: any) {
      toast.error('Failed to delete banner', err.message || 'An unexpected error occurred');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const allBanners = Object.values(bannersByLocation).flat();
      const banner = allBanners.find(b => b.id === id);
      if (!banner) return;

      const newStatus = banner.status === 'active' ? 'inactive' : 'active';
      await bannersService.updateBanner(id, { status: newStatus });
      toast.success(`Banner ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      await loadBanners();
    } catch (err: any) {
      toast.error('Failed to update banner status', err.message || 'An unexpected error occurred');
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setFormLoading(true);

      if (editingBanner) {
        await bannersService.updateBanner(editingBanner.id, data);
        toast.success('Banner updated successfully');
      } else {
        await bannersService.createBanner(data);
        toast.success('Banner created successfully');
      }

      setShowForm(false);
      setEditingBanner(undefined);
      await loadBanners();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save banner';
      toast.error('Failed to save banner', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBanner(undefined);
  };

  // Drag and drop handlers - per location
  const handleDragStart = (e: React.DragEvent, banner: Banner, location: BannerLocation) => {
    setDraggedBanner({ banner, location });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', banner.id.toString());
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedBanner(null);
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetBanner: Banner, targetLocation: BannerLocation) => {
    e.preventDefault();
    
    if (!draggedBanner || draggedBanner.location !== targetLocation) {
      // Only allow reordering within the same location
      setDraggedBanner(null);
      return;
    }

    const sourceBanner = draggedBanner.banner;
    
    if (sourceBanner.id === targetBanner.id) {
      setDraggedBanner(null);
      return;
    }

    // Reorder banners in the location
    const locationBanners = [...bannersByLocation[targetLocation]];
    const sourceIndex = locationBanners.findIndex(b => b.id === sourceBanner.id);
    const targetIndex = locationBanners.findIndex(b => b.id === targetBanner.id);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedBanner(null);
      return;
    }

    // Remove source and insert at target position
    locationBanners.splice(sourceIndex, 1);
    locationBanners.splice(targetIndex, 0, sourceBanner);

    // Update local state immediately for responsive UI
    setBannersByLocation(prev => ({
      ...prev,
      [targetLocation]: locationBanners
    }));

    setDraggedBanner(null);

    // Save new positions to server
    try {
      setSavingPositions(targetLocation);
      const positions: Record<number, number> = {};
      locationBanners.forEach((banner, index) => {
        positions[banner.id] = index;
      });

      await bannersService.updateBannerPositions(positions);
      toast.success('Banner positions updated successfully');
      await loadBanners();
    } catch (err: any) {
      toast.error('Failed to update banner positions', err.message);
      // Reload to restore correct order
      await loadBanners();
    } finally {
      setSavingPositions(null);
    }
  };

  const renderLocationSection = (location: BannerLocation) => {
    const locationBanners = bannersByLocation[location];
    
    return (
      <div key={location} className={styles.locationSection}>
        <div className={styles.locationHeader}>
          <h3 className={styles.locationTitle}>{LOCATION_LABELS[location]}</h3>
          <span className={styles.locationCount}>
            {locationBanners.length} {locationBanners.length === 1 ? 'banner' : 'banners'}
          </span>
        </div>

        {savingPositions === location && (
          <div className={styles.savingIndicator}>
            Saving positions...
          </div>
        )}

        {locationBanners.length === 0 ? (
          <div className={styles.emptyLocation}>
            <p>No banners in this location</p>
          </div>
        ) : (
          <>
            <div className={styles.sortInfo}>
              <span>💡 Drag and drop to reorder within this section</span>
            </div>
            <div className={styles.bannerGrid}>
              {locationBanners.map((banner) => (
                <BannerCard
                  key={banner.id}
                  banner={banner}
                  onEdit={handleEditBanner}
                  onDelete={handleDeleteBanner}
                  onToggleStatus={handleToggleStatus}
                  isDragging={draggedBanner?.banner.id === banner.id}
                  onDragStart={(e) => handleDragStart(e, banner, location)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, banner, location)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const totalBanners = Object.values(bannersByLocation).reduce((sum, banners) => sum + banners.length, 0);

  return (
    <div className={styles.bannerList}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Banner Management</h2>
          <div className={styles.headerStats}>
            <span className={styles.totalCount}>Total: {totalBanners} banners</span>
          </div>
        </div>
        <button
          onClick={handleCreateBanner}
          className={styles.createButton}
        >
          ➕ Create Banner
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span>❌ {error}</span>
          <button onClick={() => loadBanners()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading banners...</span>
        </div>
      ) : (
        <div className={styles.locationSections}>
          {(Object.keys(LOCATION_LABELS) as BannerLocation[]).map(location => 
            renderLocationSection(location)
          )}
        </div>
      )}

      {showForm && (
        <BannerForm
          banner={editingBanner}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={formLoading}
        />
      )}
      
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </div>
  );
};
