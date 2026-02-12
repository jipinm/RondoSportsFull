import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Layers,
  ChevronRight,
  Link2,
  Check,
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import {
  hospitalityService,
  type Hospitality,
  type HospitalityInput,
  type HospitalityAssignment,
  type AssignmentLevel,
} from '../services/hospitalityService';
import styles from './HospitalityManagement.module.css';

// Helper to get current season (e.g., "25/26")
const getCurrentSeason = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month >= 7) {
    const currentYearShort = year.toString().slice(-2);
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${currentYearShort}/${nextYearShort}`;
  } else {
    const prevYearShort = (year - 1).toString().slice(-2);
    const currentYearShort = year.toString().slice(-2);
    return `${prevYearShort}/${currentYearShort}`;
  }
};

// Known sports and their team support
interface Sport {
  sport_type: string;
  name: string;
  has_teams: boolean;
}

const KNOWN_SPORTS: Sport[] = [
  { sport_type: 'soccer', name: 'Soccer', has_teams: true },
  { sport_type: 'motorsport', name: 'Motorsport', has_teams: false },
  { sport_type: 'tennis', name: 'Tennis', has_teams: false },
  { sport_type: 'rugby', name: 'Rugby', has_teams: true },
  { sport_type: 'basketball', name: 'Basketball', has_teams: true },
  { sport_type: 'cricket', name: 'Cricket', has_teams: true },
  { sport_type: 'american_football', name: 'American Football', has_teams: true },
  { sport_type: 'ice_hockey', name: 'Ice Hockey', has_teams: true },
  { sport_type: 'boxing', name: 'Boxing', has_teams: false },
  { sport_type: 'mma', name: 'MMA', has_teams: false },
  { sport_type: 'golf', name: 'Golf', has_teams: false },
  { sport_type: 'cycling', name: 'Cycling', has_teams: false },
];

const LEVEL_LABELS: Record<AssignmentLevel, string> = {
  sport: 'Sport Level',
  tournament: 'Tournament Level',
  team: 'Team Level',
  event: 'Event Level',
  ticket: 'Ticket Category Level',
};

const LEVEL_DESCRIPTIONS: Record<AssignmentLevel, string> = {
  sport: 'Selected services will be available for ALL events and tickets under this sport',
  tournament: 'Selected services will be available for all events and tickets in this tournament',
  team: 'Selected services will be available for all events and tickets for this team',
  event: 'Selected services will be available for all tickets under this event',
  ticket: 'Selected services will be available only for this specific ticket category',
};

// XS2Event API types
interface Tournament {
  tournament_id: string;
  name: string;
  official_name: string;
  season: string;
}

interface Team {
  team_id: string;
  name: string;
  official_name: string;
}

interface XS2Event {
  event_id: string;
  event_name: string;
  tournament_name: string;
  venue_name: string;
  date_start: string;
}

interface XS2Ticket {
  ticket_id: string;
  ticket_title: string;
  face_value: number;
  currency_code: string;
  ticket_status: string;
}

type ViewMode = 'services' | 'assignments';

const HospitalityManagement: React.FC = () => {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('services');

  // Hospitality services state
  const [hospitalities, setHospitalities] = useState<Hospitality[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create/Edit form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<HospitalityInput>({
    name: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  // Stats
  const [stats, setStats] = useState<{
    total_hospitalities: number;
    active_hospitalities: number;
    total_assignments: number;
    unique_events_with_hospitalities: number;
    assignments_by_level?: Record<string, number>;
  } | null>(null);

  // ===== Hierarchical assignment state =====
  const [sports, setSports] = useState<Sport[]>(KNOWN_SPORTS);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<XS2Event[]>([]);
  const [tickets, setTickets] = useState<XS2Ticket[]>([]);

  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<XS2Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<XS2Ticket | null>(null);

  const [targetLevel, setTargetLevel] = useState<AssignmentLevel>('sport');

  // Checkbox selections for hospitalities at current scope
  const [selectedHospitalityIds, setSelectedHospitalityIds] = useState<number[]>([]);
  const [scopeAssignments, setScopeAssignments] = useState<HospitalityAssignment[]>([]);

  // All existing hierarchical assignments
  const [existingAssignments, setExistingAssignments] = useState<HospitalityAssignment[]>([]);

  const { toasts, closeToast, success, error } = useToast();

  // ==========================================================================
  // Fetch hospitality services
  // ==========================================================================

  const fetchHospitalities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await hospitalityService.getAllHospitalities();
      setHospitalities(response.data);
    } catch (err) {
      console.error('Failed to fetch hospitalities:', err);
      error('Failed to load hospitality services');
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await hospitalityService.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchHospitalities();
    fetchStats();
  }, [fetchHospitalities, fetchStats]);

  // ==========================================================================
  // Fetch existing hierarchical assignments
  // ==========================================================================

  const fetchExistingAssignments = useCallback(async () => {
    try {
      const response = await hospitalityService.getAllAssignments({ limit: 100 });
      setExistingAssignments(response.data);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
      setExistingAssignments([]);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'assignments') {
      fetchExistingAssignments();
    }
  }, [viewMode, fetchExistingAssignments]);

  // ==========================================================================
  // Hierarchical XS2Event API calls
  // ==========================================================================

  const fetchSports = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(`${baseUrl}/v1/sports`, {
        headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        const rawSports: any[] = data.sports || data.data || (Array.isArray(data) ? data : []);
        if (rawSports.length > 0) {
          const fetchedSports: Sport[] = rawSports
            .map((s: any) => ({
              sport_type: s.sport_type || s.slug || s.name?.toLowerCase()?.replace(/\s+/g, '_') || '',
              name: s.name || s.sport_type || s.slug || '',
              has_teams: s.has_teams ?? KNOWN_SPORTS.find(k => k.sport_type === (s.sport_type || s.slug))?.has_teams ?? true,
            }))
            .filter((s) => s.sport_type && s.name);
          if (fetchedSports.length > 0) {
            setSports(fetchedSports);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sports:', err);
    }
  }, []);

  const fetchTournaments = useCallback(async (sportType: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;
      const currentSeason = getCurrentSeason();

      const response = await fetch(
        `${baseUrl}/v1/tournaments?sport_type=${sportType}&season=${currentSeason}`,
        { headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey } }
      );

      if (!response.ok) throw new Error('Failed to fetch tournaments');
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      error('Failed to load tournaments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchTeams = useCallback(async (sportType: string, tournamentId: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(
        `${baseUrl}/v1/teams?sport_type=${sportType}&tournament_id=${tournamentId}`,
        { headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey } }
      );

      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      error('Failed to load teams: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchEvents = useCallback(async (tournamentId: string, teamId?: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      let url = `${baseUrl}/v1/events?tournament_id=${tournamentId}&page_size=100`;
      if (teamId) url += `&team_id=${teamId}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey },
      });

      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events || data.data?.events || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      error('Failed to load events: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchTickets = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(`${baseUrl}/v1/tickets?event_id=${eventId}`, {
        headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey },
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      const ticketList = data.tickets || data.data?.tickets || [];
      setTickets(ticketList);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      error('Failed to load tickets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  // ==========================================================================
  // Hierarchy Selection Handlers
  // ==========================================================================

  const buildScopeQuery = useCallback(() => {
    const scope: Record<string, string | undefined> = {};
    if (selectedSport) scope.sport_type = selectedSport.sport_type;
    if (selectedTournament) scope.tournament_id = selectedTournament.tournament_id;
    if (selectedTeam) scope.team_id = selectedTeam.team_id;
    if (selectedEvent) scope.event_id = selectedEvent.event_id;
    if (selectedTicket) scope.ticket_id = selectedTicket.ticket_id;
    return scope;
  }, [selectedSport, selectedTournament, selectedTeam, selectedEvent, selectedTicket]);

  const fetchScopeAssignments = useCallback(async () => {
    if (!selectedSport) return;

    try {
      const scope = buildScopeQuery();
      const response = await hospitalityService.getAssignmentsAtScope(scope);
      setScopeAssignments(response.data || []);
      setSelectedHospitalityIds((response.data || []).map((a: HospitalityAssignment) => a.hospitality_id));
    } catch (err) {
      console.error('Failed to fetch scope assignments:', err);
      setScopeAssignments([]);
      setSelectedHospitalityIds([]);
    }
  }, [selectedSport, buildScopeQuery]);

  // Fetch current scope assignments whenever the selection changes
  useEffect(() => {
    if (viewMode === 'assignments' && selectedSport) {
      fetchScopeAssignments();
    }
  }, [viewMode, selectedSport, selectedTournament, selectedTeam, selectedEvent, selectedTicket, fetchScopeAssignments]);

  const handleSportSelect = async (sportType: string) => {
    const sport = sports.find(s => s.sport_type === sportType);
    setSelectedSport(sport || null);
    setSelectedTournament(null);
    setSelectedTeam(null);
    setSelectedEvent(null);
    setSelectedTicket(null);
    setTournaments([]);
    setTeams([]);
    setEvents([]);
    setTickets([]);
    setTargetLevel('sport');
    setSelectedHospitalityIds([]);
    setScopeAssignments([]);

    if (sport) {
      await fetchTournaments(sportType);
    }
  };

  const handleTournamentSelect = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.tournament_id === tournamentId);
    setSelectedTournament(tournament || null);
    setSelectedTeam(null);
    setSelectedEvent(null);
    setSelectedTicket(null);
    setTeams([]);
    setEvents([]);
    setTickets([]);
    setTargetLevel('tournament');
    setSelectedHospitalityIds([]);
    setScopeAssignments([]);

    if (tournament && selectedSport) {
      if (selectedSport.has_teams) {
        await fetchTeams(selectedSport.sport_type, tournamentId);
      } else {
        await fetchEvents(tournamentId);
      }
    }
  };

  const handleTeamSelect = async (teamId: string) => {
    const team = teams.find(t => t.team_id === teamId);
    setSelectedTeam(team || null);
    setSelectedEvent(null);
    setSelectedTicket(null);
    setEvents([]);
    setTickets([]);
    setTargetLevel('team');
    setSelectedHospitalityIds([]);
    setScopeAssignments([]);

    if (team && selectedTournament) {
      await fetchEvents(selectedTournament.tournament_id, teamId);
    }
  };

  const handleEventSelect = async (eventId: string) => {
    const event = events.find(e => e.event_id === eventId);
    setSelectedEvent(event || null);
    setSelectedTicket(null);
    setTickets([]);
    setTargetLevel('event');
    setSelectedHospitalityIds([]);
    setScopeAssignments([]);

    if (event) {
      await fetchTickets(event.event_id);
    }
  };

  const handleTicketSelect = (ticketId: string) => {
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    setSelectedTicket(ticket || null);
    setTargetLevel('ticket');
    setSelectedHospitalityIds([]);
    setScopeAssignments([]);
  };

  // Determine available levels based on selection
  const getAvailableLevels = (): AssignmentLevel[] => {
    const levels: AssignmentLevel[] = [];
    if (selectedSport) levels.push('sport');
    if (selectedTournament) levels.push('tournament');
    if (selectedTeam) levels.push('team');
    if (selectedEvent) levels.push('event');
    if (selectedTicket) levels.push('ticket');
    return levels;
  };

  // Build the breadcrumb display
  const getBreadcrumb = (): string[] => {
    const parts: string[] = [];
    if (selectedSport) parts.push(selectedSport.name);
    if (selectedTournament) parts.push(selectedTournament.official_name || selectedTournament.name);
    if (selectedTeam) parts.push(selectedTeam.official_name || selectedTeam.name);
    if (selectedEvent) parts.push(selectedEvent.event_name);
    if (selectedTicket) parts.push(selectedTicket.ticket_title);
    return parts;
  };

  // Level badge color
  const getLevelColor = (level: AssignmentLevel): string => {
    switch (level) {
      case 'sport': return '#8b5cf6';
      case 'tournament': return '#3b82f6';
      case 'team': return '#10b981';
      case 'event': return '#f59e0b';
      case 'ticket': return '#ef4444';
      default: return '#64748b';
    }
  };

  // ==========================================================================
  // CRUD Operations (Services)
  // ==========================================================================

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      sort_order: 0,
    });
    setShowCreateForm(false);
    setEditingId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error('Name is required');
      return;
    }

    setSaving(true);
    try {
      await hospitalityService.createHospitality(formData);
      success('Hospitality service created successfully');
      resetForm();
      fetchHospitalities();
      fetchStats();
    } catch (err) {
      console.error('Failed to create hospitality:', err);
      error('Failed to create hospitality service');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (hospitality: Hospitality) => {
    setEditingId(hospitality.id);
    setFormData({
      name: hospitality.name,
      description: hospitality.description || '',
      is_active: hospitality.is_active,
      sort_order: hospitality.sort_order,
    });
    setShowCreateForm(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!formData.name.trim()) {
      error('Name is required');
      return;
    }

    setSaving(true);
    try {
      await hospitalityService.updateHospitality(editingId, formData);
      success('Hospitality service updated successfully');
      resetForm();
      fetchHospitalities();
    } catch (err) {
      console.error('Failed to update hospitality:', err);
      error('Failed to update hospitality service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this hospitality service?')) {
      return;
    }

    setSaving(true);
    try {
      await hospitalityService.deleteHospitality(id);
      success('Hospitality service deleted successfully');
      fetchHospitalities();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete hospitality:', err);
      error('Failed to delete hospitality service');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (hospitality: Hospitality) => {
    setSaving(true);
    try {
      await hospitalityService.updateHospitality(hospitality.id, {
        is_active: !hospitality.is_active,
      });
      success(`Hospitality service ${hospitality.is_active ? 'deactivated' : 'activated'}`);
      fetchHospitalities();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle hospitality status:', err);
      error('Failed to update hospitality status');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // Hierarchical Assignment operations
  // ==========================================================================

  const handleHospitalityCheckboxToggle = (hospitalityId: number) => {
    setSelectedHospitalityIds(prev => {
      if (prev.includes(hospitalityId)) {
        return prev.filter(id => id !== hospitalityId);
      } else {
        return [...prev, hospitalityId];
      }
    });
  };

  const handleSelectAllHospitalities = () => {
    const activeIds = activeHospitalities.map(h => h.id);
    const allSelected = activeIds.every(id => selectedHospitalityIds.includes(id));
    if (allSelected) {
      setSelectedHospitalityIds([]);
    } else {
      setSelectedHospitalityIds(activeIds);
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedSport) {
      error('Please select at least a sport');
      return;
    }

    // Validate target level matches selection
    if (targetLevel === 'tournament' && !selectedTournament) {
      error('Please select a tournament for tournament-level assignment');
      return;
    }
    if (targetLevel === 'team' && !selectedTeam) {
      error('Please select a team for team-level assignment');
      return;
    }
    if (targetLevel === 'event' && !selectedEvent) {
      error('Please select an event for event-level assignment');
      return;
    }
    if (targetLevel === 'ticket' && !selectedTicket) {
      error('Please select a ticket for ticket-level assignment');
      return;
    }

    setSaving(true);
    try {
      const scopeData: any = {
        sport_type: selectedSport.sport_type,
        sport_name: selectedSport.name,
        hospitality_ids: selectedHospitalityIds,
      };

      // Set hierarchy IDs based on target level
      if (targetLevel !== 'sport' && selectedTournament) {
        scopeData.tournament_id = selectedTournament.tournament_id;
        scopeData.tournament_name = selectedTournament.official_name || selectedTournament.name;
      }
      if (['team', 'event', 'ticket'].includes(targetLevel) && selectedTeam) {
        scopeData.team_id = selectedTeam.team_id;
        scopeData.team_name = selectedTeam.official_name || selectedTeam.name;
      }
      if (['event', 'ticket'].includes(targetLevel) && selectedEvent) {
        scopeData.event_id = selectedEvent.event_id;
        scopeData.event_name = selectedEvent.event_name;
      }
      if (targetLevel === 'ticket' && selectedTicket) {
        scopeData.ticket_id = selectedTicket.ticket_id;
        scopeData.ticket_name = selectedTicket.ticket_title;
      }

      await hospitalityService.replaceAssignmentsAtScope(scopeData);

      success(`Hospitality assignments saved at ${LEVEL_LABELS[targetLevel]}`);
      await fetchScopeAssignments();
      await fetchExistingAssignments();
      fetchStats();
    } catch (err: any) {
      console.error('Failed to save assignments:', err);
      error('Failed to save hospitality assignments: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      await hospitalityService.deleteAssignment(assignmentId);
      setExistingAssignments(prev => prev.filter(a => a.id !== assignmentId));
      success('Assignment removed');
      await fetchScopeAssignments();
      fetchStats();
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      error('Failed to delete assignment: ' + err.message);
    }
  };

  // Check if selections differ from existing scope assignments
  const hasAssignmentChanges = (): boolean => {
    const existingSorted = [...scopeAssignments.map(a => a.hospitality_id)].sort((a, b) => a - b);
    const selectedSorted = [...selectedHospitalityIds].sort((a, b) => a - b);
    return JSON.stringify(existingSorted) !== JSON.stringify(selectedSorted);
  };

  // Active hospitalities for assignment
  const activeHospitalities = hospitalities.filter(h => h.is_active);
  const availableLevels = getAvailableLevels();
  const breadcrumb = getBreadcrumb();
  const hasTeams = selectedSport?.has_teams ?? true;

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Coffee size={28} />
            Hospitality Management
          </h1>
          <p className={styles.subtitle}>
            Manage hospitality services and assign them hierarchically across sports, tournaments, teams, events, and tickets
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => { fetchHospitalities(); fetchStats(); }} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total_hospitalities}</div>
            <div className={styles.statLabel}>Total Services</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.active_hospitalities}</div>
            <div className={styles.statLabel}>Active Services</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total_assignments}</div>
            <div className={styles.statLabel}>Hierarchical Assignments</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.unique_events_with_hospitalities}</div>
            <div className={styles.statLabel}>Events with Hospitality</div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${viewMode === 'services' ? styles.activeTab : ''}`}
          onClick={() => setViewMode('services')}
        >
          <Coffee size={18} />
          Manage Services
        </button>
        <button
          className={`${styles.tab} ${viewMode === 'assignments' ? styles.activeTab : ''}`}
          onClick={() => setViewMode('assignments')}
        >
          <Link2 size={18} />
          Assign to Tickets
        </button>
      </div>

      <div className={styles.content}>
        {/* ================================================================== */}
        {/* SERVICES VIEW */}
        {/* ================================================================== */}
        {viewMode === 'services' && (
          <>
            {/* Create New Button */}
            {!showCreateForm && !editingId && (
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                <Plus size={16} />
                Add New Hospitality Service
              </Button>
            )}

            {/* Create/Edit Form */}
            {(showCreateForm || editingId) && (
              <Card className={styles.formCard}>
                <h2 className={styles.cardTitle}>
                  {editingId ? 'Edit Hospitality Service' : 'Create New Hospitality Service'}
                </h2>
                <form onSubmit={editingId ? handleEditSubmit : handleCreateSubmit} className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={styles.input}
                        placeholder="e.g., VIP Lounge Access"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Sort Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formGroupFull}>
                      <label className={styles.label}>Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={styles.textarea}
                        placeholder="Describe what the service includes..."
                        rows={3}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Status</label>
                      <div className={styles.toggleWrapper}>
                        <button
                          type="button"
                          className={`${styles.toggleBtn} ${formData.is_active ? styles.active : ''}`}
                          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        >
                          {formData.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          {formData.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <Button type="submit" variant="primary" disabled={saving}>
                      <Save size={16} />
                      {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
                      <X size={16} />
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Hospitality Services List */}
            <Card className={styles.listCard}>
              <h2 className={styles.cardTitle}>Hospitality Services</h2>

              {loading && hospitalities.length === 0 ? (
                <div className={styles.loading}>Loading hospitality services...</div>
              ) : hospitalities.length === 0 ? (
                <div className={styles.empty}>
                  <Coffee size={48} className={styles.emptyIcon} />
                  <p>No hospitality services found</p>
                  <p className={styles.emptyHint}>Create your first hospitality service above</p>
                </div>
              ) : (
                <div className={styles.servicesList}>
                  {hospitalities.map((hospitality) => (
                    <div key={hospitality.id} className={`${styles.serviceItem} ${!hospitality.is_active ? styles.inactive : ''}`}>
                      <div className={styles.serviceInfo}>
                        <div className={styles.serviceHeader}>
                          <h3 className={styles.serviceName}>{hospitality.name}</h3>
                          <span className={`${styles.badge} ${hospitality.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                            {hospitality.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {hospitality.description && (
                          <p className={styles.serviceDescription}>{hospitality.description}</p>
                        )}
                        <div className={styles.serviceMeta}>
                          <span>Order: {hospitality.sort_order}</span>
                        </div>
                      </div>
                      <div className={styles.serviceActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleToggleActive(hospitality)}
                          disabled={saving}
                          title={hospitality.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {hospitality.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleEditStart(hospitality)}
                          disabled={saving || editingId !== null}
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(hospitality.id)}
                          disabled={saving}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ================================================================== */}
        {/* ASSIGNMENTS VIEW (Hierarchical) */}
        {/* ================================================================== */}
        {viewMode === 'assignments' && (
          <>
            {/* Step 1: Sport Selection */}
            <Card className={styles.selectionCard}>
              <h2 className={styles.cardTitle}>Step 1: Select Sport Type</h2>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={selectedSport?.sport_type || ''}
                  onChange={(e) => handleSportSelect(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Select Sport --</option>
                  {sports.map(sport => (
                    <option key={sport.sport_type} value={sport.sport_type}>
                      {sport.name} {sport.has_teams ? '' : '(No Teams)'}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Step 2: Tournament Selection */}
            {selectedSport && (
              <Card className={styles.selectionCard}>
                <h2 className={styles.cardTitle}>Step 2: Select Tournament (Optional)</h2>
                <p className={styles.helpText}>
                  Skip this to assign hospitalities at the sport level to all {selectedSport.name} events
                </p>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedTournament?.tournament_id || ''}
                    onChange={(e) => handleTournamentSelect(e.target.value)}
                    disabled={loading || tournaments.length === 0}
                  >
                    <option value="">-- Select Tournament (optional) --</option>
                    {tournaments.map(t => (
                      <option key={t.tournament_id} value={t.tournament_id}>
                        {t.official_name || t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {loading && tournaments.length === 0 && (
                  <div className={styles.loading}>Loading tournaments...</div>
                )}
              </Card>
            )}

            {/* Step 3: Team Selection (team sports only) */}
            {selectedTournament && hasTeams && (
              <Card className={styles.selectionCard}>
                <h2 className={styles.cardTitle}>Step 3: Select Team (Optional)</h2>
                <p className={styles.helpText}>
                  Skip this to assign hospitalities at the tournament level
                </p>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedTeam?.team_id || ''}
                    onChange={(e) => handleTeamSelect(e.target.value)}
                    disabled={loading || teams.length === 0}
                  >
                    <option value="">-- Select Team (optional) --</option>
                    {teams.map(t => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.official_name || t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {loading && teams.length === 0 && selectedTournament && (
                  <div className={styles.loading}>Loading teams...</div>
                )}
              </Card>
            )}

            {/* Step: Event Selection */}
            {((selectedTournament && !hasTeams) || selectedTeam) && (
              <Card className={styles.selectionCard}>
                <h2 className={styles.cardTitle}>
                  Step {hasTeams ? '4' : '3'}: Select Event (Optional)
                </h2>
                <p className={styles.helpText}>
                  Skip this to assign hospitalities at the {selectedTeam ? 'team' : 'tournament'} level
                </p>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedEvent?.event_id || ''}
                    onChange={(e) => handleEventSelect(e.target.value)}
                    disabled={loading || events.length === 0}
                  >
                    <option value="">-- Select Event (optional) --</option>
                    {events.map(e => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.event_name} - {new Date(e.date_start).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                {loading && events.length === 0 && (
                  <div className={styles.loading}>Loading events...</div>
                )}
              </Card>
            )}

            {/* Step: Ticket Selection */}
            {selectedEvent && (
              <Card className={styles.selectionCard}>
                <h2 className={styles.cardTitle}>
                  Step {hasTeams ? '5' : '4'}: Select Ticket Category (Optional)
                </h2>
                <p className={styles.helpText}>
                  Skip this to assign hospitalities at the event level to all tickets
                </p>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={selectedTicket?.ticket_id || ''}
                    onChange={(e) => handleTicketSelect(e.target.value)}
                    disabled={loading || tickets.length === 0}
                  >
                    <option value="">-- Select Ticket (optional) --</option>
                    {tickets.map(t => (
                      <option key={t.ticket_id} value={t.ticket_id}>
                        {t.ticket_title}
                      </option>
                    ))}
                  </select>
                </div>
                {loading && tickets.length === 0 && (
                  <div className={styles.loading}>Loading tickets...</div>
                )}
              </Card>
            )}

            {/* Breadcrumb, Level Selection & Service Checkboxes */}
            {selectedSport && (
              <Card className={styles.configCard}>
                <h2 className={styles.cardTitle}>
                  <Layers size={20} />
                  Assign Hospitality Services
                </h2>

                {/* Breadcrumb */}
                {breadcrumb.length > 0 && (
                  <div className={styles.breadcrumb}>
                    {breadcrumb.map((part, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <ChevronRight size={14} className={styles.breadcrumbSeparator} />}
                        <span className={styles.breadcrumbItem}>{part}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Target Level Selection */}
                <div className={styles.levelSelection}>
                  <label className={styles.label}>Assign at level:</label>
                  <div className={styles.levelButtons}>
                    {availableLevels.map(level => (
                      <button
                        key={level}
                        className={`${styles.levelBtn} ${targetLevel === level ? styles.levelBtnActive : ''}`}
                        style={targetLevel === level ? { borderColor: getLevelColor(level), color: getLevelColor(level), backgroundColor: `${getLevelColor(level)}10` } : {}}
                        onClick={() => setTargetLevel(level)}
                      >
                        <span
                          className={styles.levelDot}
                          style={{ backgroundColor: getLevelColor(level) }}
                        />
                        {LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                  <p className={styles.levelDescription}>
                    {LEVEL_DESCRIPTIONS[targetLevel]}
                  </p>
                </div>

                {/* Hospitality Service Checkboxes */}
                {activeHospitalities.length === 0 ? (
                  <div className={styles.noActiveWarning}>
                    <Coffee size={32} />
                    <p>No active hospitality services. Create and activate services in the &quot;Manage Services&quot; tab first.</p>
                    <Button variant="primary" onClick={() => setViewMode('services')}>
                      Go to Manage Services
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className={styles.serviceSelectorHeader}>
                      <label className={styles.label}>
                        Select services to make available ({selectedHospitalityIds.length} of {activeHospitalities.length} selected):
                      </label>
                      <button
                        className={styles.selectAllBtn}
                        onClick={handleSelectAllHospitalities}
                      >
                        {activeHospitalities.every(h => selectedHospitalityIds.includes(h.id))
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    <div className={styles.serviceCheckboxGrid}>
                      {activeHospitalities.map(h => (
                        <label key={h.id} className={`${styles.serviceCheckbox} ${selectedHospitalityIds.includes(h.id) ? styles.serviceChecked : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedHospitalityIds.includes(h.id)}
                            onChange={() => handleHospitalityCheckboxToggle(h.id)}
                          />
                          <div className={styles.serviceCheckboxInfo}>
                            <span className={styles.serviceCheckboxName}>{h.name}</span>
                            {h.description && (
                              <span className={styles.serviceCheckboxDesc}>{h.description}</span>
                            )}
                          </div>
                          {selectedHospitalityIds.includes(h.id) && (
                            <Check size={16} className={styles.checkIcon} />
                          )}
                        </label>
                      ))}
                    </div>

                    <div className={styles.assignmentSaveActions}>
                      <Button
                        variant="primary"
                        onClick={handleSaveAssignment}
                        disabled={saving || !hasAssignmentChanges()}
                      >
                        <Save size={16} />
                        {saving ? 'Saving...' : `Save ${LEVEL_LABELS[targetLevel]} Assignments`}
                      </Button>
                      {scopeAssignments.length > 0 && !hasAssignmentChanges() && (
                        <span className={styles.savedBadge}>
                          <Check size={14} /> Saved
                        </span>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Existing Assignments Table */}
            <Card className={styles.existingCard}>
              <div className={styles.existingHeader}>
                <h2 className={styles.cardTitle}>
                  Existing Hospitality Assignments ({existingAssignments.length})
                </h2>
                <Button variant="ghost" onClick={fetchExistingAssignments} disabled={loading}>
                  <RefreshCw size={16} className={loading ? styles.spinning : ''} />
                  Refresh
                </Button>
              </div>

              {existingAssignments.length === 0 ? (
                <div className={styles.noData}>
                  No hierarchical hospitality assignments configured yet. Use the form above to assign services at any level.
                </div>
              ) : (
                <div className={styles.rulesTable}>
                  <div className={styles.rulesTableHeader}>
                    <div>Level</div>
                    <div>Scope</div>
                    <div>Service</div>
                    <div>Status</div>
                    <div>Updated</div>
                    <div>Actions</div>
                  </div>

                  <div className={styles.rulesTableBody}>
                    {existingAssignments.map(assignment => (
                      <div key={assignment.id} className={styles.ruleRow}>
                        <div>
                          <span
                            className={styles.levelBadge}
                            style={{ backgroundColor: getLevelColor(assignment.level), color: '#fff' }}
                          >
                            {assignment.level.charAt(0).toUpperCase() + assignment.level.slice(1)}
                          </span>
                        </div>

                        <div className={styles.scopeCell}>
                          {assignment.sport_name && <span className={styles.scopeItem}>{assignment.sport_name}</span>}
                          {assignment.tournament_name && (
                            <>
                              <ChevronRight size={12} />
                              <span className={styles.scopeItem}>{assignment.tournament_name}</span>
                            </>
                          )}
                          {assignment.team_name && (
                            <>
                              <ChevronRight size={12} />
                              <span className={styles.scopeItem}>{assignment.team_name}</span>
                            </>
                          )}
                          {assignment.event_name && (
                            <>
                              <ChevronRight size={12} />
                              <span className={styles.scopeItem}>{assignment.event_name}</span>
                            </>
                          )}
                          {assignment.ticket_name && (
                            <>
                              <ChevronRight size={12} />
                              <span className={styles.scopeItem}>{assignment.ticket_name}</span>
                            </>
                          )}
                        </div>

                        <div className={styles.serviceNameCell}>
                          {assignment.hospitality_name || `Service #${assignment.hospitality_id}`}
                        </div>

                        <div>
                          <span className={assignment.is_active ? styles.statusActive : styles.statusInactive}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className={styles.timestamp}>
                          {new Date(assignment.updated_at).toLocaleString()}
                        </div>

                        <div className={styles.rowActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            disabled={saving}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Priority Info */}
            <Card className={styles.infoCard}>
              <h2 className={styles.cardTitle}>
                <Coffee size={20} />
                Assignment Priority Rules (Additive)
              </h2>
              <div className={styles.priorityList}>
                <div className={styles.priorityItem}>
                  <span className={styles.priorityBadge} style={{ backgroundColor: '#ef4444' }}>1</span>
                  <div>
                    <strong>Ticket Category Level</strong> — Most specific. Services assigned directly to a ticket category.
                  </div>
                </div>
                <div className={styles.priorityItem}>
                  <span className={styles.priorityBadge} style={{ backgroundColor: '#f59e0b' }}>2</span>
                  <div>
                    <strong>Event Level</strong> — Services available for all tickets under a specific event.
                  </div>
                </div>
                <div className={styles.priorityItem}>
                  <span className={styles.priorityBadge} style={{ backgroundColor: '#10b981' }}>3</span>
                  <div>
                    <strong>Team Level</strong> — Services available for all events/tickets for a team (team sports only).
                  </div>
                </div>
                <div className={styles.priorityItem}>
                  <span className={styles.priorityBadge} style={{ backgroundColor: '#3b82f6' }}>4</span>
                  <div>
                    <strong>Tournament Level</strong> — Services available for all events/tickets in a tournament.
                  </div>
                </div>
                <div className={styles.priorityItem}>
                  <span className={styles.priorityBadge} style={{ backgroundColor: '#8b5cf6' }}>5</span>
                  <div>
                    <strong>Sport Level</strong> — Least specific. Services available for ALL events/tickets under a sport type.
                  </div>
                </div>
              </div>
              <p className={styles.priorityNote}>
                <strong>Additive Model:</strong> Services are collected from ALL matching levels. A ticket inherits services from its event, team, tournament, and sport levels. If the same service appears at multiple levels, the most specific assignment is used.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default HospitalityManagement;
