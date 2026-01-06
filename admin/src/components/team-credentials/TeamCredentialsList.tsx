import React, { useState, useEffect, useCallback } from 'react';
import Table from '../Table';
import Button from '../Button';
import Card from '../Card';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useToast } from '../../hooks/useToast';
import ToastContainer from '../ToastContainer';
import { teamCredentialsService, type TeamCredential } from '../../services/teamCredentialsService';
import styles from './TeamCredentialsList.module.css';

interface TeamCredentialsListProps {
  onEdit?: (credential: TeamCredential) => void;
  refreshTrigger?: number;
}

const TeamCredentialsList: React.FC<TeamCredentialsListProps> = ({
  onEdit,
  refreshTrigger = 0
}) => {
  const [credentials, setCredentials] = useState<TeamCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingFeatured, setTogglingFeatured] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<{ id: number; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_items: 0,
    total_pages: 0
  });

  // Toast notifications
  const toast = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadCredentials = useCallback(async (page: number = 1, per_page: number = 20, search?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page, per_page };
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const response = await teamCredentialsService.getTeamCredentials(params);
      
      setCredentials(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team credentials');
      console.error('Error loading team credentials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials(1, 20, debouncedSearchTerm);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [loadCredentials, refreshTrigger, debouncedSearchTerm]);

  const handlePageChange = (newPage: number) => {
    loadCredentials(newPage, 20, debouncedSearchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadCredentials(1, 20, searchTerm);
  };

  const handleStatusBadge = (status: string) => {
    const color = teamCredentialsService.getStatusColor(status);
    return (
      <span className={`${styles.statusBadge} ${styles[`status${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return teamCredentialsService.formatDate(dateString);
  };

  const handleToggleFeatured = async (id: number, currentValue: number) => {
    try {
      setTogglingFeatured(id);
      const newValue = currentValue === 1 ? false : true;
      
      console.log('=== Toggle Featured Status ===');
      console.log('ID:', id);
      console.log('Current Value:', currentValue);
      console.log('New Value:', newValue);
      
      const result = await teamCredentialsService.toggleFeaturedStatus(id, newValue);
      
      console.log('API Response:', result);
      
      // Update local state
      setCredentials(prev => 
        prev.map(cred => 
          cred.id === id 
            ? { ...cred, is_featured: newValue ? 1 : 0 }
            : cred
        )
      );
      
      console.log('Featured status updated successfully');
    } catch (err: any) {
      console.error('=== Toggle Featured Error ===');
      console.error('Error:', err);
      console.error('Error message:', err?.message);
      console.error('Error response:', err?.response);
      console.error('Error data:', err?.response?.data);
      
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to update featured status. Please try again.';
      alert(errorMessage);
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleDelete = async (id: number, teamName: string) => {
    setCredentialToDelete({ id, name: teamName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!credentialToDelete) return;

    try {
      setDeletingId(credentialToDelete.id);
      
      console.log('=== Delete Team Credential ===');
      console.log('ID:', credentialToDelete.id);
      
      await teamCredentialsService.deleteTeamCredential(credentialToDelete.id);
      
      console.log('Delete successful');
      
      // Remove from local state
      setCredentials(prev => prev.filter(cred => cred.id !== credentialToDelete.id));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total_items: prev.total_items - 1
      }));
      
      // If the current page is now empty and it's not page 1, go to previous page
      if (credentials.length === 1 && pagination.page > 1) {
        loadCredentials(pagination.page - 1, 20, debouncedSearchTerm);
      }
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setCredentialToDelete(null);
      
      toast.success('Team credential deleted successfully');
    } catch (err: any) {
      console.error('=== Delete Error ===');
      console.error('Error:', err);
      
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to delete team credential. Please try again.';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCredentialToDelete(null);
  };

  const renderImagePreview = (url?: string, alt?: string) => {
    if (!url) {
      return <span className={styles.noImage}>No image</span>;
    }

    // Get full URL using the service utility
    const fullUrl = teamCredentialsService.getFullImageUrl(url);
    if (!fullUrl) {
      return <span className={styles.noImage}>No image</span>;
    }

    return (
      <div className={styles.imagePreview}>
        <img 
          src={fullUrl} 
          alt={alt || 'Team credential image'} 
          className={styles.previewImage}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const nextElement = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
            if (nextElement) {
              nextElement.style.display = 'block';
            }
          }}
        />
        <span className={styles.noImage} style={{ display: 'none' }}>
          Image unavailable
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <div className={styles.loading}>Loading team credentials...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className={styles.error}>
          <p>Error: {error}</p>
          <Button onClick={() => loadCredentials(1, 20, debouncedSearchTerm)} variant="primary" size="sm">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (credentials.length === 0) {
    return (
      <Card>
        <div className={styles.empty}>
          <p>No team credentials found.</p>
          <p>Create your first team credential to get started.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.header}>
        <div className={styles.searchSection}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by team name..."
              className={styles.searchInput}
            />
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
            {searchTerm && (
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  loadCredentials(1, 20, '');
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            Total: {pagination.total_items}
            {debouncedSearchTerm && ` (filtered by "${debouncedSearchTerm}")`}
          </span>
          <span className={styles.statItem}>
            Page {pagination.page} of {pagination.total_pages}
          </span>
        </div>
      </div>

      <Table striped hoverable>
        <Table.Head>
          <Table.Row isHeader>
            <Table.HeaderCell>Team Name</Table.HeaderCell>
            <Table.HeaderCell>Tournament</Table.HeaderCell>
            <Table.HeaderCell>Logo</Table.HeaderCell>
            <Table.HeaderCell>Banner</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Featured</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {credentials.map((credential) => (
            <Table.Row key={credential.id}>
              <Table.Cell>
                <div className={styles.teamInfo}>
                  <div className={styles.teamName}>
                    {credential.team_name || `Team ${credential.team_id}`}
                  </div>
                  <div className={styles.teamId}>ID: {credential.team_id}</div>
                  {credential.short_description && (
                    <div className={styles.description}>
                      {credential.short_description}
                    </div>
                  )}
                </div>
              </Table.Cell>
              
              <Table.Cell>
                <div className={styles.tournamentInfo}>
                  <div className={styles.tournamentName}>
                    {credential.tournament_name || credential.tournament_id}
                  </div>
                  <div className={styles.tournamentId}>ID: {credential.tournament_id}</div>
                </div>
              </Table.Cell>

              <Table.Cell>
                {renderImagePreview(credential.logo_url, 'Team logo')}
              </Table.Cell>

              <Table.Cell>
                {renderImagePreview(credential.banner_url, 'Team banner')}
              </Table.Cell>

              <Table.Cell>
                {handleStatusBadge(credential.status)}
              </Table.Cell>

              <Table.Cell>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={credential.is_featured === 1}
                    onChange={() => handleToggleFeatured(credential.id, credential.is_featured)}
                    disabled={togglingFeatured === credential.id}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </Table.Cell>

              <Table.Cell>
                <div className={styles.dateInfo}>
                  <div>{formatDate(credential.created_at)}</div>
                  <div className={styles.creator}>
                    by {credential.created_by_name || `User ${credential.created_by}`}
                  </div>
                </div>
              </Table.Cell>

              <Table.Cell>
                <div className={styles.actions}>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(credential)}
                      title="Edit credential"
                      disabled={deletingId === credential.id}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(credential.id, credential.team_name || `Team ${credential.team_id}`)}
                    title="Delete credential"
                    disabled={deletingId === credential.id}
                    className={styles.deleteButton}
                  >
                    {deletingId === credential.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {pagination.total_pages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Previous
          </Button>
          
          <div className={styles.pageNumbers}>
            {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
              const page = Math.max(1, pagination.page - 2) + i;
              if (page > pagination.total_pages) return null;
              
              return (
                <Button
                  key={page}
                  variant={page === pagination.page ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        teamName={credentialToDelete?.name || ''}
        isDeleting={deletingId !== null}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </div>
  );
};

export default TeamCredentialsList;