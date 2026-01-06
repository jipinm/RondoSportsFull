import React, { useState, useRef } from 'react';
import styles from './BannerImageUpload.module.css';

interface BannerImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null) => void;
  maxSizeMessage?: string;
}

export const BannerImageUpload: React.FC<BannerImageUploadProps> = ({
  currentImageUrl,
  onImageChange,
  maxSizeMessage = "Maximum file size: 10MB"
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type - support jpeg, jpg, png, svg, webp, avif
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'image/avif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file format. Allowed formats: JPEG, JPG, PNG, SVG, WebP, AVIF';
    }

    // Check file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeded. Maximum allowed size is 10MB';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Call the callback
    onImageChange(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    setError('');
    onImageChange(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploadContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp,image/avif"
        onChange={handleFileInputChange}
        className={styles.hiddenInput}
      />

      {previewUrl ? (
        <div className={styles.previewContainer}>
          <img 
            src={previewUrl} 
            alt="Banner preview" 
            className={styles.previewImage}
          />
          <div className={styles.imageOverlay}>
            <button
              type="button"
              onClick={openFileDialog}
              className={styles.changeButton}
            >
              📷 Change Image
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className={styles.removeButton}
            >
              🗑️ Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className={styles.dropZoneContent}>
            <div className={styles.uploadIcon}>📷</div>
            <div className={styles.uploadText}>
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div className={styles.uploadSubtext}>
              {maxSizeMessage}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.uploadHints}>
        <div className={styles.hint}>
          📐 <strong>Recommended Image Dimensions:</strong> Homepage Hero: 1920×600px. | Homepage Secondary: 1080×1350px.
        </div>
        <div className={styles.hint}>
          🎨 <strong>Supporting Formats:</strong> JPEG, JPG, PNG, SVG, WebP, and AVIF.
        </div>
      </div>
    </div>
  );
};