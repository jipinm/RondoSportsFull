import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { 
  TeamCredentialsList, 
  TeamCredentialsForm,
  TeamCredentialsStats,
  TeamCredentialsFileUpload,
  type TeamCredential
} from '../components/team-credentials';
import Button from '../components/Button';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import styles from './TeamCredentials.module.css';

const TeamCredentials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingCredential, setEditingCredential] = useState<TeamCredential | null>(null);
  const toast = useToast();

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCreateNew = () => {
    setEditingCredential(null);
    setActiveTab('create');
  };

  const handleEdit = (credential: TeamCredential) => {
    setEditingCredential(credential);
    setActiveTab('edit');
  };

  const handleFormSubmit = (success: boolean, message?: string) => {
    if (success) {
      setActiveTab('list');
      setEditingCredential(null);
      triggerRefresh();
      // Show success notification
      console.log(message || 'Operation completed successfully');
    } else {
      setError(message || 'Operation failed');
    }
  };

  const handleFormCancel = () => {
    setActiveTab('list');
    setEditingCredential(null);
  };

  const reloadEditingCredential = useCallback(async () => {
    if (editingCredential) {
      try {
        const { teamCredentialsService } = await import('../services/teamCredentialsService');
        const response = await teamCredentialsService.getTeamCredentialById(editingCredential.id);
        if (response.success && response.data) {
          setEditingCredential(response.data);
        }
      } catch (error) {
        console.error('Failed to reload credential:', error);
      }
    }
  }, [editingCredential]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Team Credentials Management</h1>
          <p className={styles.subtitle}>
            Manage team credentials for soccer tournaments, including logos, banners, and descriptions.
          </p>
        </div>

        <div className={styles.headerActions}>
          {activeTab === 'list' && (
            <Button variant="primary" onClick={handleCreateNew}>
              <Plus size={16} />
              Create Credential
            </Button>
          )}

          {(activeTab === 'create' || activeTab === 'edit') && (
            <Button variant="ghost" onClick={handleFormCancel}>
              ← Back to List
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <p>{error}</p>
          <button onClick={() => setError(null)} className={styles.errorClose}>
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {activeTab === 'list' && (
          <>
            {/* Statistics */}
            <div className={styles.statsSection}>
              <TeamCredentialsStats refreshTrigger={refreshTrigger} />
            </div>

            {/* Team Credentials List */}
            <TeamCredentialsList
              refreshTrigger={refreshTrigger}
              onEdit={handleEdit}
            />
          </>
        )}

        {activeTab === 'create' && (
          <TeamCredentialsForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        )}

        {activeTab === 'edit' && (
          <div className={styles.editView}>
            <TeamCredentialsForm
              credential={editingCredential}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
            
            {editingCredential && (
              <div className={styles.fileUploadSection}>
                <TeamCredentialsFileUpload
                  credential={editingCredential}
                  onSuccess={(message) => {
                    toast.success(message);
                    triggerRefresh(); // Refresh the data to show updated files
                  }}
                  onError={(error) => {
                    if (error) {
                      toast.error(error);
                    }
                  }}
                  onImageDeleted={reloadEditingCredential}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </div>
  );
};

export default TeamCredentials;