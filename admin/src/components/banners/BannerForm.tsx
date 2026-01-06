import React, { useState, useEffect } from 'react';
import type { Banner, BannerCreate, BannerUpdate } from '../../types/banners';
import { BannerImageUpload } from './BannerImageUpload';
import styles from './BannerForm.module.css';

interface BannerFormProps {
  banner?: Banner;
  onSubmit: (data: BannerCreate | BannerUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const BannerForm: React.FC<BannerFormProps> = ({
  banner,
  onSubmit,
  onCancel,
  isLoading = false
}) => {

  /**
   * Convert date string to local date input format (date-only, no time)
   * Input: "2025-12-17" or "2025-12-17T10:00:00.000Z"
   * Output: "2025-12-17" (for date input)
   */
  const toDateInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error converting to date input:', error);
      return '';
    }
  };

  /**
   * Format date for display: "Saturday, December 20th"
   */
  const formatEventDate = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    
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
      return null;
    }
  };

  const [formData, setFormData] = useState({
    title: banner?.title || '',
    description: banner?.description || '',
    location: banner?.location || '',
    link_url: banner?.link_url || '',
    link_target: banner?.link_target || '_self' as const,
    event_date: toDateInput(banner?.event_date),
    price_tag: banner?.price_tag || '',
    status: banner?.status || 'inactive' as const,
    image: null as File | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentImageUrl, setCurrentImageUrl] = useState(banner?.image_url || '');

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title,
        description: banner.description || '',
        location: banner.location || '',
        link_url: banner.link_url || '',
        link_target: banner.link_target || '_self',
        event_date: toDateInput(banner.event_date),
        price_tag: banner.price_tag || '',
        status: banner.status,
        image: null
      });
      setCurrentImageUrl(banner.image_url || '');
    }
  }, [banner]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.link_url && !isValidUrl(formData.link_url)) {
      newErrors.link_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim() || null,
        link_url: formData.link_url.trim() || null,
        link_target: formData.link_target,
        event_date: formData.event_date || null,
        price_tag: formData.price_tag.trim() || null,
        status: formData.status
      };

      // Add image only if a new one was selected
      if (formData.image) {
        submitData.image = formData.image;
      }

      await onSubmit(submitData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      setErrors({ submit: error.message || 'Failed to save banner' });
    }
  };

  const isEditMode = !!banner;

  return (
    <div className={styles.formOverlay}>
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>
            {isEditMode ? 'Edit Banner' : 'Create New Banner'}
          </h2>
          <button 
            onClick={onCancel}
            className={styles.closeButton}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.submit && (
            <div className={styles.errorAlert}>
              {errors.submit}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="Enter banner title"
              maxLength={255}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={styles.textarea}
              placeholder="Enter banner description"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="location" className={styles.label}>
                Location
              </label>
              <select
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={styles.select}
              >
                <option value="">All Locations</option>
                <option value="homepage_hero">Homepage Hero</option>
                <option value="homepage_secondary">Homepage Secondary</option>
                <option value="category_page">Category Page</option>
                <option value="event_page">Event Page</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status" className={styles.label}>
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as any)}
                className={styles.select}
              >
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="link_url" className={styles.label}>
              Link URL
            </label>
            <input
              id="link_url"
              type="url"
              value={formData.link_url}
              onChange={(e) => handleInputChange('link_url', e.target.value)}
              className={`${styles.input} ${errors.link_url ? styles.inputError : ''}`}
              placeholder="https://example.com"
            />
            {errors.link_url && <span className={styles.errorText}>{errors.link_url}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="link_target" className={styles.label}>
              Link Target
            </label>
            <select
              id="link_target"
              value={formData.link_target}
              onChange={(e) => handleInputChange('link_target', e.target.value)}
              className={styles.select}
            >
              <option value="_self">Same Tab</option>
              <option value="_blank">New Tab</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="price_tag" className={styles.label}>
              Price Tag <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              id="price_tag"
              type="text"
              value={formData.price_tag}
              onChange={(e) => handleInputChange('price_tag', e.target.value)}
              className={styles.input}
              placeholder="e.g., From AED 250"
              maxLength={45}
            />
            <span className={styles.helperText}>Display price information for events (max 45 characters)</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="event_date" className={styles.label}>
              Event Date <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) => handleInputChange('event_date', e.target.value)}
              className={styles.input}
            />
            {formData.event_date && (
              <div className={styles.datePreview}>
                📅 {formatEventDate(formData.event_date)}
              </div>
            )}
            <small className={styles.helpText}>
              Select an event date for display purposes.
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Banner Image</label>
            <BannerImageUpload
              currentImageUrl={currentImageUrl}
              onImageChange={handleImageChange}
              maxSizeMessage="Maximum file size: 10MB."
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (isEditMode ? 'Update Banner' : 'Create Banner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};