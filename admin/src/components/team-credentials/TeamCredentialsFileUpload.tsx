import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Button';
import Card from '../Card';
import DeleteConfirmModal from './DeleteConfirmModal';
import { teamCredentialsService, type TeamCredential } from '../../services/teamCredentialsService';
import styles from './TeamCredentialsFileUpload.module.css';

interface TeamCredentialsFileUploadProps {
  credential: TeamCredential;
  onSuccess?: (message: string) => void;
  onError?: (error: string | undefined) => void;
  onImageDeleted?: () => void;
}

interface FileData {
  logo?: File;
  banner?: File;
}

interface FormErrors {
  logo?: string;
  banner?: string;
  general?: string;
}

const TeamCredentialsFileUpload: React.FC<TeamCredentialsFileUploadProps> = ({
  credential,
  onSuccess,
  onError,
  onImageDeleted
}) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileData>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [removingLogo, setRemovingLogo] = useState(false);
  const [removingBanner, setRemovingBanner] = useState(false);
  const [imageRemoved, setImageRemoved] = useState({ logo: false, banner: false });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageTypeToDelete, setImageTypeToDelete] = useState<'logo' | 'banner' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    
    console.log(`=== FILE UPLOAD DEBUG (${type}) ===`);
    console.log('File selected:', file);
    
    if (file) {
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Validate file
      const validation = teamCredentialsService.validateImageFile(file);
      console.log('Validation result:', validation);
      
      if (!validation.valid) {
        console.log('File validation failed:', validation.error);
        setErrors(prev => ({
          ...prev,
          [type]: validation.error || 'Invalid file'
        }));
        return;
      }

      console.log('Setting file in state...');
      setFiles(prev => {
        const newFiles = {
          ...prev,
          [type]: file
        };
        console.log('New files state:', newFiles);
        return newFiles;
      });

      // Clear error
      if (errors[type]) {
        setErrors(prev => ({
          ...prev,
          [type]: undefined
        }));
      }
    } else {
      // File was cleared
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[type];
        return newFiles;
      });
    }
  };

  const handleRemoveImageClick = (type: 'logo' | 'banner') => {
    setImageTypeToDelete(type);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!imageTypeToDelete) return;

    const type = imageTypeToDelete;
    setDeleteModalOpen(false);

    try {
      const setRemoving = type === 'logo' ? setRemovingLogo : setRemovingBanner;
      setRemoving(true);
      setErrors({});

      await teamCredentialsService.deleteTeamCredentialImage(credential.id, type);
      
      // Mark image as removed
      setImageRemoved(prev => ({ ...prev, [type]: true }));
      
      // Clear any selected file for this type
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[type];
        return newFiles;
      });

      // Show success message
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      onSuccess?.(`${capitalizedType} removed successfully`);
      
      // Trigger credential refresh to update UI
      onImageDeleted?.();
      
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      const errorMessage = `Failed to remove ${type}`;
      setErrors({ [type]: errorMessage });
      onError?.(errorMessage);
    } finally {
      const setRemoving = type === 'logo' ? setRemovingLogo : setRemovingBanner;
      setRemoving(false);
      setImageTypeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setImageTypeToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(files).length === 0) {
      setErrors({ general: 'Please select at least one file to upload.' });
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      console.log('=== FILE UPLOAD SUBMIT ===');
      console.log('Files to upload:', files);

      const response = await teamCredentialsService.updateTeamCredentialFiles(
        credential.id,
        files
      );

      if (response.success) {
        console.log('=== SUCCESS RESPONSE ===');
        console.log('Response:', response);
        
        // Immediate redirect without success message
        console.log('Redirecting immediately to /team-credentials');
        
        try {
          // Try React Router navigation first
          navigate('/team-credentials');
          console.log('React Router navigate called');
        } catch (error) {
          console.error('React Router navigation failed:', error);
        }
        
        // Fallback: Force redirect using window.location
        setTimeout(() => {
          console.log('Fallback redirect using window.location');
          window.location.href = '/team-credentials';
        }, 100);
        
      } else {
        console.log('=== UPLOAD FAILED ===');
        console.log('Response:', response);
        setErrors(response.errors || { general: 'Failed to upload files' });
        onError?.('Failed to upload files');
      }
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = 'An unexpected error occurred while uploading files.';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFileInput = (type: 'logo' | 'banner', label: string, currentUrl?: string) => {
    const isRemoving = type === 'logo' ? removingLogo : removingBanner;
    const wasRemoved = imageRemoved[type];
    const hasCurrentImage = currentUrl && !wasRemoved;

    return (
      <div className={styles.fileInputGroup}>
        <label className={styles.fileLabel}>
          {label}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, type)}
            className={styles.fileInput}
            disabled={loading || isRemoving}
          />
        </label>
        
        {errors[type] && (
          <span className={styles.error}>{errors[type]}</span>
        )}
        
        {files[type] && (
          <div className={styles.filePreview}>
            <span className={styles.fileName}>Selected: {files[type]!.name}</span>
          </div>
        )}
        
        {!files[type] && hasCurrentImage && (
          <div className={styles.currentFile}>
            <div className={styles.currentHeader}>
              <span className={styles.currentLabel}>Current file:</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemoveImageClick(type)}
                disabled={loading || isRemoving}
                className={styles.removeButton}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
            <img 
              src={teamCredentialsService.getFullImageUrl(currentUrl)} 
              alt={`Current ${label.toLowerCase()}`}
              className={styles.currentImage}
            />
          </div>
        )}
        
        {wasRemoved && !files[type] && (
          <div className={styles.removedNotice}>
            <span>{label} has been removed</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <div className={styles.container}>
        <h4 className={styles.title}>Update Files</h4>
        <p className={styles.description}>
          Upload new logo and/or banner images. Existing files will be replaced.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.general && (
            <div className={styles.generalError}>{errors.general}</div>
          )}

          <div className={styles.fileInputs}>
            {renderFileInput('logo', 'Team Logo', credential.logo_url)}
            {renderFileInput('banner', 'Team Banner', credential.banner_url)}
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || Object.keys(files).length === 0}
              className={styles.uploadButton}
            >
              {loading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </form>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={`Remove ${imageTypeToDelete ? imageTypeToDelete.charAt(0).toUpperCase() + imageTypeToDelete.slice(1) : 'Image'}`}
        message={`Are you sure you want to remove the ${imageTypeToDelete || 'image'} for "${credential.team_name}"?`}
        itemName={credential.team_name}
        details={[
          `${imageTypeToDelete === 'logo' ? 'Team logo' : 'Team banner'} image file will be deleted from the server`,
          'The image will no longer be displayed for this team',
          'You can upload a new image at any time'
        ]}
        isDeleting={imageTypeToDelete === 'logo' ? removingLogo : removingBanner}
      />
    </Card>
  );
};

export default TeamCredentialsFileUpload;