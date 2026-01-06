import React, { useState, useEffect } from 'react';
import Button from '../Button';
import Card from '../Card';
import { teamCredentialsService, type TeamCredential, type TeamCredentialCreate, type TeamCredentialUpdate } from '../../services/teamCredentialsService';
import styles from './TeamCredentialsForm.module.css';

interface TeamCredentialsFormProps {
  credential?: TeamCredential | null;
  onSubmit: (success: boolean, message?: string) => void;
  onCancel: () => void;
}

interface Tournament {
  tournament_id: string;
  official_name: string;
}

interface Team {
  team_id: string;
  official_name: string;
}

interface FormData {
  tournament_id: string;
  team_id: string;
  short_description: string;
  status: 'active' | 'inactive';
}

interface FileData {
  logo?: File;
  banner?: File;
}

const TeamCredentialsForm: React.FC<TeamCredentialsFormProps> = ({
  credential,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    tournament_id: '',
    team_id: '',
    short_description: '',
    status: 'active'
  });

  const [files, setFiles] = useState<FileData>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Dropdown data states
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  
  // Selected tournament and team names for display
  const [selectedTournamentName, setSelectedTournamentName] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');

  const isEditing = !!credential;

  useEffect(() => {
    // Load tournaments on component mount
    loadTournaments();
    
    if (credential) {
      setFormData({
        tournament_id: credential.tournament_id,
        team_id: credential.team_id,
        short_description: credential.short_description || '',
        status: credential.status
      });
      
      // If editing, load teams for the selected tournament
      if (credential.tournament_id) {
        loadTeams(credential.tournament_id);
      }
    }
  }, [credential]);

  // Helper function to calculate current season based on local date
  const getCurrentSeason = (): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    
    // If we're in the first half of the year (Jan-Jun), we're still in the previous season
    // If we're in the second half (Jul-Dec), we're in the new season
    const seasonStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
    const seasonEndYear = seasonStartYear + 1;
    
    // Format as "YY/YY" (e.g., "25/26" for 2025/2026)
    const startYearShort = seasonStartYear.toString().slice(-2);
    const endYearShort = seasonEndYear.toString().slice(-2);
    
    return `${startYearShort}/${endYearShort}`;
  };

  const loadTournaments = async () => {
    try {
      setTournamentsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL;
      const currentSeason = getCurrentSeason();
      const tournamentUrl = `${apiUrl}/v1/tournaments?sport_type=soccer&season=${currentSeason}`;
      console.log('Loading tournaments from:', tournamentUrl);
      const response = await fetch(tournamentUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('Tournaments loaded:', data.tournaments?.length || 0);
        setTournaments(data.tournaments || []);
      } else {
        console.error('Failed to load tournaments, status:', response.status);
        setErrors(prev => ({ ...prev, tournaments: 'Failed to load tournaments' }));
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setErrors(prev => ({ ...prev, tournaments: 'Failed to load tournaments' }));
    } finally {
      setTournamentsLoading(false);
    }
  };

  const loadTeams = async (tournamentId: string) => {
    try {
      setTeamsLoading(true);
      setTeams([]); // Clear existing teams
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/v1/teams?sport_type=soccer&tournament_id=${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        setErrors(prev => ({ ...prev, teams: 'Failed to load teams' }));
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setErrors(prev => ({ ...prev, teams: 'Failed to load teams' }));
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tournament_id') {
      // When tournament changes, reset team selection and load new teams
      setFormData(prev => ({
        ...prev,
        tournament_id: value,
        team_id: '' // Reset team selection
      }));
      
      // Find selected tournament name
      const selectedTournament = tournaments.find(t => t.tournament_id === value);
      setSelectedTournamentName(selectedTournament?.official_name || '');
      setSelectedTeamName(''); // Reset team name
      
      // Load teams for selected tournament
      if (value) {
        loadTeams(value);
      } else {
        setTeams([]);
      }
    } else if (name === 'team_id') {
      setFormData(prev => ({
        ...prev,
        team_id: value
      }));
      
      // Find selected team name
      const selectedTeam = teams.find(t => t.team_id === value);
      setSelectedTeamName(selectedTeam?.official_name || '');
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user makes selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    
    console.log(`=== FILE CHANGE DEBUG (${type}) ===`);
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
          [type]: ''
        }));
      }
    } else {
      console.log('No file selected');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tournament_id.trim()) {
      newErrors.tournament_id = 'Tournament ID is required';
    }

    if (!formData.team_id.trim()) {
      newErrors.team_id = 'Team ID is required';
    }

    if (formData.short_description.length > 500) {
      newErrors.short_description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      // Debug: Log the files being passed
      console.log('=== FILE UPLOAD DEBUG ===');
      console.log('Files object:', files);
      console.log('Logo file:', files.logo);
      console.log('Banner file:', files.banner);
      if (files.logo) {
        console.log('Logo file details:', {
          name: files.logo.name,
          size: files.logo.size,
          type: files.logo.type
        });
      }
      if (files.banner) {
        console.log('Banner file details:', {
          name: files.banner.name,
          size: files.banner.size,
          type: files.banner.type
        });
      }

      if (isEditing && credential) {
        // Update existing credential
        console.log('=== UPDATE FORM DEBUG ===');
        console.log('Original credential:', credential);
        console.log('Current form data:', formData);
        console.log('Current selected team name:', selectedTeamName);
        console.log('Current selected tournament name:', selectedTournamentName);
        console.log('Current files:', files);

        const updateData: TeamCredentialUpdate = {};
        
        // Only include changed fields - use stricter comparison and ensure we have data
        if (selectedTeamName !== (credential.team_name || '')) {
          console.log(`Team name changed: "${credential.team_name || ''}" -> "${selectedTeamName}"`);
          updateData.team_name = selectedTeamName || undefined;
        }
        if (selectedTournamentName !== (credential.tournament_name || '')) {
          console.log(`Tournament name changed: "${credential.tournament_name || ''}" -> "${selectedTournamentName}"`);
          updateData.tournament_name = selectedTournamentName || undefined;
        }
        if (formData.short_description !== (credential.short_description || '')) {
          console.log(`Description changed: "${credential.short_description || ''}" -> "${formData.short_description}"`);
          updateData.short_description = formData.short_description || undefined;
        }
        if (formData.status !== credential.status) {
          console.log(`Status changed: "${credential.status}" -> "${formData.status}"`);
          updateData.status = formData.status;
        }

        // If no changes detected but user clicked submit, ensure we send current status
        if (Object.keys(updateData).length === 0 && Object.keys(files).length === 0) {
          console.log('No changes detected, sending current status to ensure update');
          updateData.status = formData.status;
        }

        console.log('Final updateData:', updateData);
        console.log('Note: Files are now handled separately via TeamCredentialsFileUpload component');

        const response = await teamCredentialsService.updateTeamCredential(
          credential.id,
          updateData
        );

        if (response.success) {
          onSubmit(true, 'Team credential updated successfully');
        } else {
          setErrors(response.errors || { general: 'Failed to update team credential' });
        }
      } else {
        // Create new credential
        const createData: TeamCredentialCreate = {
          tournament_id: formData.tournament_id,
          team_id: formData.team_id,
          team_name: selectedTeamName || undefined,
          tournament_name: selectedTournamentName || undefined,
          short_description: formData.short_description || undefined,
          status: formData.status
        };

        // Only pass files if they exist
        const filesToUpload = Object.keys(files).length > 0 ? files : undefined;
        console.log('Files to upload:', filesToUpload);

        const response = await teamCredentialsService.createTeamCredential(createData, filesToUpload);

        if (response.success) {
          onSubmit(true, 'Team credential created successfully');
        } else {
          setErrors(response.errors || { general: 'Failed to create team credential' });
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderFileInput = (type: 'logo' | 'banner', label: string, currentUrl?: string) => (
    <div className={styles.fileInputGroup}>
      <label className={styles.label} htmlFor={`${type}-input`}>
        {label}
      </label>
      
      {currentUrl && (
        <div className={styles.currentImage}>
          <span className={styles.currentImageLabel}>Current {label.toLowerCase()}:</span>
          <img 
            src={teamCredentialsService.getFullImageUrl(currentUrl) || currentUrl} 
            alt={`Current ${label.toLowerCase()}`} 
            className={styles.currentImagePreview} 
          />
        </div>
      )}
      
      <input
        id={`${type}-input`}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp,image/avif"
        onChange={(e) => handleFileChange(e, type)}
        className={styles.fileInput}
      />
      
      {files[type] && (
        <div className={styles.selectedFile}>
          <span className={styles.selectedFileLabel}>Selected: {files[type]!.name}</span>
        </div>
      )}
      
      {errors[type] && (
        <span className={styles.error}>{errors[type]}</span>
      )}
    </div>
  );

  return (
    <Card title={isEditing ? 'Edit Team Credential' : 'Create Team Credential'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Tournament and Team Selection */}
        <div className={styles.apiSection}>
          <div className={styles.apiHeader}>
            <h4>Tournament & Team Selection</h4>
            <p className={styles.apiDescription}>
              Select tournament and team from the dropdown lists populated from the XS2Event API
            </p>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="tournament_id" className={styles.label}>
              Tournament *
            </label>
            <select
              id="tournament_id"
              name="tournament_id"
              value={formData.tournament_id}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={tournamentsLoading}
            >
              <option value="">
                {tournamentsLoading ? 'Loading tournaments...' : 'Select a tournament'}
              </option>
              {tournaments.map((tournament) => (
                <option key={tournament.tournament_id} value={tournament.tournament_id}>
                  {tournament.official_name}
                </option>
              ))}
            </select>
            {errors.tournament_id && (
              <span className={styles.error}>{errors.tournament_id}</span>
            )}
            {errors.tournaments && (
              <span className={styles.error}>{errors.tournaments}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="team_id" className={styles.label}>
              Team *
            </label>
            <select
              id="team_id"
              name="team_id"
              value={formData.team_id}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={teamsLoading || !formData.tournament_id}
            >
              <option value="">
                {!formData.tournament_id 
                  ? 'Select a tournament first' 
                  : teamsLoading 
                    ? 'Loading teams...' 
                    : 'Select a team'
                }
              </option>
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.official_name}
                </option>
              ))}
            </select>
            {errors.team_id && (
              <span className={styles.error}>{errors.team_id}</span>
            )}
            {errors.teams && (
              <span className={styles.error}>{errors.teams}</span>
            )}
          </div>

          {selectedTournamentName && selectedTeamName && (
            <div className={styles.apiResults}>
              <h5>Selected:</h5>
              <div className={styles.apiResult}>
                <strong>Tournament:</strong> {selectedTournamentName}
              </div>
              <div className={styles.apiResult}>
                <strong>Team:</strong> {selectedTeamName}
              </div>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className={styles.section}>
          <h4>Basic Information</h4>
          
          {isEditing && (
            <div className={styles.readOnlyGroup}>
              <div className={styles.readOnlyField}>
                <span className={styles.label}>Tournament ID:</span>
                <span className={styles.readOnlyValue}>{formData.tournament_id}</span>
              </div>
              <div className={styles.readOnlyField}>
                <span className={styles.label}>Team ID:</span>
                <span className={styles.readOnlyValue}>{formData.team_id}</span>
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="short_description" className={styles.label}>
              Description
            </label>
            <textarea
              id="short_description"
              name="short_description"
              value={formData.short_description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Enter a short description (optional, max 500 characters)"
              rows={3}
              maxLength={500}
            />
            <div className={styles.charCounter}>
              {formData.short_description.length}/500 characters
            </div>
            {errors.short_description && (
              <span className={styles.error}>{errors.short_description}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="status" className={styles.label}>
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* File Uploads - Only show for create mode */}
        {!isEditing && (
          <div className={styles.section}>
            <h4>Images</h4>
            <p className={styles.sectionDescription}>
              Upload team logo and banner images. Supported formats: PNG, JPEG. Max size: 2MB each.
            </p>
            
            <div className={styles.fileInputs}>
              {renderFileInput('logo', 'Team Logo')}
              {renderFileInput('banner', 'Team Banner')}
            </div>
          </div>
        )}

        {/* File Uploads Note for Edit Mode */}
        {isEditing && (
          <div className={styles.section}>
            <h4>Images</h4>
            <p className={styles.sectionDescription}>
              File uploads are handled separately below. Use the "Update Files" section to change logo and banner images.
            </p>
          </div>
        )}

        {/* General Errors */}
        {errors.general && (
          <div className={styles.generalError}>
            {errors.general}
          </div>
        )}

        {/* Form Actions */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Credential' : 'Create Credential')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TeamCredentialsForm;