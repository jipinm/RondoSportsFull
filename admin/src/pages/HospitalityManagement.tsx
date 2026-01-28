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
  Ticket,
  Link2
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import { 
  hospitalityService, 
  type Hospitality, 
  type HospitalityInput,
  type TicketHospitality 
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

type ViewMode = 'services' | 'tickets';

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
    price_usd: 0,
    is_active: true,
    sort_order: 0
  });
  
  // Ticket assignment state (hierarchical selection like Markup Pricing)
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<XS2Event[]>([]);
  const [tickets, setTickets] = useState<XS2Ticket[]>([]);
  
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<XS2Event | null>(null);
  
  // Map of ticket_id -> selected hospitality_ids[]
  const [ticketHospitalities, setTicketHospitalities] = useState<Record<string, number[]>>({});
  // Existing assignments from DB
  const [existingAssignments, setExistingAssignments] = useState<Record<string, TicketHospitality[]>>({});
  
  // Stats
  const [stats, setStats] = useState<{
    total_hospitalities: number;
    active_hospitalities: number;
    total_assignments: number;
    unique_events_with_hospitalities: number;
  } | null>(null);
  
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
  // Hierarchical selection for tickets (same as Markup Pricing)
  // ==========================================================================

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;
      const currentSeason = getCurrentSeason();

      const response = await fetch(`${baseUrl}/v1/tournaments?sport_type=soccer&season=${currentSeason}`, {
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch tournaments');
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (err: any) {
      console.error('Failed to fetch tournaments:', err);
      error('Failed to load tournaments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchTeams = useCallback(async (tournamentId: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(`${baseUrl}/v1/teams?sport_type=soccer&tournament_id=${tournamentId}`, {
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
      error('Failed to load teams: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchEvents = useCallback(async (tournamentId: string, teamId: string) => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(`${baseUrl}/v1/events?tournament_id=${tournamentId}&team_id=${teamId}&page_size=100`, {
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      console.log('Events API Response:', data);
      setEvents(data.events || data.data?.events || []);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      error('Failed to load events: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchTickets = useCallback(async (eventId: string) => {
    console.log('fetchTickets called for eventId:', eventId);
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;
      const url = `${baseUrl}/v1/tickets?event_id=${eventId}`;
      console.log('Fetching tickets from:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log('Tickets API Response:', data);
      const ticketsArray = data.tickets || data.data?.tickets || [];
      console.log('Tickets found:', ticketsArray.length);
      setTickets(ticketsArray);
      
      // Also fetch existing hospitality assignments for this event
      const assignmentsResponse = await hospitalityService.getEventHospitalities(eventId);
      setExistingAssignments(assignmentsResponse.grouped_by_ticket || {});
      
      // Initialize ticketHospitalities from existing assignments
      const initialAssignments: Record<string, number[]> = {};
      if (assignmentsResponse.grouped_by_ticket) {
        Object.entries(assignmentsResponse.grouped_by_ticket).forEach(([ticketId, assignments]) => {
          initialAssignments[ticketId] = assignments.map(a => a.hospitality_id);
        });
      }
      setTicketHospitalities(initialAssignments);
      
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Load tournaments when switching to tickets view
  useEffect(() => {
    if (viewMode === 'tickets' && tournaments.length === 0) {
      fetchTournaments();
    }
  }, [viewMode, tournaments.length, fetchTournaments]);

  // Handle tournament selection
  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.tournament_id === tournamentId) || null;
    setSelectedTournament(tournament);
    setSelectedTeam(null);
    setSelectedEvent(null);
    setTeams([]);
    setEvents([]);
    setTickets([]);
    setTicketHospitalities({});
    setExistingAssignments({});
    
    if (tournament) {
      fetchTeams(tournamentId);
    }
  };

  // Handle team selection
  const handleTeamChange = (teamId: string) => {
    const team = teams.find(t => t.team_id === teamId) || null;
    setSelectedTeam(team);
    setSelectedEvent(null);
    setEvents([]);
    setTickets([]);
    setTicketHospitalities({});
    setExistingAssignments({});
    
    if (team && selectedTournament) {
      fetchEvents(selectedTournament.tournament_id, teamId);
    }
  };

  // Handle event selection
  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e.event_id === eventId) || null;
    setSelectedEvent(event);
    setTickets([]);
    setTicketHospitalities({});
    setExistingAssignments({});
    
    if (event) {
      fetchTickets(eventId);
    }
  };

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_usd: 0,
      is_active: true,
      sort_order: 0
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
      price_usd: hospitality.price_usd,
      is_active: hospitality.is_active,
      sort_order: hospitality.sort_order
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
        is_active: !hospitality.is_active
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
  // Ticket-Hospitality Assignment
  // ==========================================================================

  const handleHospitalityToggle = (ticketId: string, hospitalityId: number) => {
    setTicketHospitalities(prev => {
      const current = prev[ticketId] || [];
      if (current.includes(hospitalityId)) {
        // Remove
        return {
          ...prev,
          [ticketId]: current.filter(id => id !== hospitalityId)
        };
      } else {
        // Add
        return {
          ...prev,
          [ticketId]: [...current, hospitalityId]
        };
      }
    });
  };

  const handleApplyToAll = (hospitalityId: number, checked: boolean) => {
    setTicketHospitalities(prev => {
      const newState = { ...prev };
      tickets.forEach(ticket => {
        const current = newState[ticket.ticket_id] || [];
        if (checked) {
          if (!current.includes(hospitalityId)) {
            newState[ticket.ticket_id] = [...current, hospitalityId];
          }
        } else {
          newState[ticket.ticket_id] = current.filter(id => id !== hospitalityId);
        }
      });
      return newState;
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedEvent) return;

    setSaving(true);
    try {
      await hospitalityService.batchAssignHospitalities({
        event_id: selectedEvent.event_id,
        tickets: ticketHospitalities
      });
      success('Hospitality assignments saved successfully');
      // Refresh existing assignments
      const assignmentsResponse = await hospitalityService.getEventHospitalities(selectedEvent.event_id);
      setExistingAssignments(assignmentsResponse.grouped_by_ticket || {});
      fetchStats();
    } catch (err) {
      console.error('Failed to save assignments:', err);
      error('Failed to save hospitality assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllAssignments = async () => {
    if (!selectedEvent) return;
    if (!confirm('Are you sure you want to remove all hospitality assignments from this event?')) {
      return;
    }

    setSaving(true);
    try {
      await hospitalityService.removeEventHospitalities(selectedEvent.event_id);
      success('All hospitality assignments removed');
      setTicketHospitalities({});
      setExistingAssignments({});
      fetchStats();
    } catch (err) {
      console.error('Failed to clear assignments:', err);
      error('Failed to remove hospitality assignments');
    } finally {
      setSaving(false);
    }
  };

  // Check if there are any changes
  const hasChanges = () => {
    const existingMap: Record<string, number[]> = {};
    Object.entries(existingAssignments).forEach(([ticketId, assignments]) => {
      existingMap[ticketId] = assignments.map(a => a.hospitality_id).sort();
    });

    for (const [ticketId, ids] of Object.entries(ticketHospitalities)) {
      const existing = existingMap[ticketId] || [];
      const current = [...ids].sort();
      if (JSON.stringify(existing) !== JSON.stringify(current)) {
        return true;
      }
    }

    // Check if any existing assignments were removed
    for (const ticketId of Object.keys(existingMap)) {
      if (!ticketHospitalities[ticketId] || ticketHospitalities[ticketId].length === 0) {
        if (existingMap[ticketId].length > 0) {
          return true;
        }
      }
    }

    return false;
  };

  // Active hospitalities for assignment
  const activeHospitalities = hospitalities.filter(h => h.is_active);

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
            Manage hospitality services and assign them to event tickets
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
            <div className={styles.statLabel}>Ticket Assignments</div>
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
          className={`${styles.tab} ${viewMode === 'tickets' ? styles.activeTab : ''}`}
          onClick={() => setViewMode('tickets')}
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
                      <label className={styles.label}>Price (USD) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_usd}
                        onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                        className={styles.input}
                        required
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
                      <label className={styles.label}>Sort Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        className={styles.input}
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
                          <span className={styles.price}>${parseFloat(String(hospitality.price_usd)).toFixed(2)} USD</span>
                          <span className={styles.separator}>•</span>
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
        {/* TICKETS VIEW */}
        {/* ================================================================== */}
        {viewMode === 'tickets' && (
          <>
            {/* Hierarchical Selection */}
            <Card className={styles.selectionCard}>
              <h2 className={styles.cardTitle}>Step 1: Select Event</h2>
              
              <div className={styles.selectionGrid}>
                {/* Tournament */}
                <div className={styles.selectGroup}>
                  <label className={styles.label}>Tournament</label>
                  <select
                    className={styles.select}
                    value={selectedTournament?.tournament_id || ''}
                    onChange={(e) => handleTournamentChange(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select Tournament</option>
                    {tournaments.map((t) => (
                      <option key={t.tournament_id} value={t.tournament_id}>
                        {t.official_name || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team */}
                <div className={styles.selectGroup}>
                  <label className={styles.label}>Team</label>
                  <select
                    className={styles.select}
                    value={selectedTeam?.team_id || ''}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={!selectedTournament || loading}
                  >
                    <option value="">Select Team</option>
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.official_name || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event */}
                <div className={styles.selectGroup}>
                  <label className={styles.label}>Event</label>
                  <select
                    className={styles.select}
                    value={selectedEvent?.event_id || ''}
                    onChange={(e) => handleEventChange(e.target.value)}
                    disabled={!selectedTeam || loading}
                  >
                    <option value="">Select Event</option>
                    {events.map((e) => (
                      <option key={e.event_id} value={e.event_id}>
                        {e.event_name} - {new Date(e.date_start).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Active Hospitalities Quick Reference */}
            {activeHospitalities.length > 0 && selectedEvent && (
              <Card className={styles.quickRefCard}>
                <h2 className={styles.cardTitle}>Step 2: Available Hospitality Services</h2>
                <div className={styles.hospitalityChips}>
                  {activeHospitalities.map((h) => (
                    <div key={h.id} className={styles.hospitalityChip}>
                      <span className={styles.chipName}>{h.name}</span>
                      <span className={styles.chipPrice}>${parseFloat(String(h.price_usd)).toFixed(2)}</span>
                      <label className={styles.applyAllLabel}>
                        <input
                          type="checkbox"
                          checked={tickets.every(t => (ticketHospitalities[t.ticket_id] || []).includes(h.id))}
                          onChange={(e) => handleApplyToAll(h.id, e.target.checked)}
                        />
                        Apply to all
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Ticket Assignment Grid */}
            {selectedEvent && tickets.length > 0 && (
              <Card className={styles.assignmentCard}>
                <h2 className={styles.cardTitle}>
                  Step 3: Assign Hospitalities to Tickets ({tickets.length} tickets)
                </h2>

                <div className={styles.ticketGrid}>
                  {tickets.map((ticket, index) => {
                    const selectedIds = ticketHospitalities[ticket.ticket_id] || [];
                    
                    return (
                      <div key={ticket.ticket_id} className={styles.ticketCard}>
                        <div className={styles.ticketHeader}>
                          <span className={styles.ticketNumber}>#{index + 1}</span>
                          <h4 className={styles.ticketTitle}>{ticket.ticket_title}</h4>
                        </div>
                        
                        <div className={styles.hospitalityOptions}>
                          {activeHospitalities.map((h) => (
                            <label key={h.id} className={styles.hospitalityOption}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(h.id)}
                                onChange={() => handleHospitalityToggle(ticket.ticket_id, h.id)}
                              />
                              <span className={styles.optionName}>{h.name}</span>
                              <span className={styles.optionPrice}>${parseFloat(String(h.price_usd)).toFixed(2)}</span>
                            </label>
                          ))}
                        </div>

                        {selectedIds.length > 0 && (
                          <div className={styles.ticketTotal}>
                            Total Add-ons: ${selectedIds.reduce((sum, id) => {
                              const h = activeHospitalities.find(x => x.id === id);
                              return sum + (h ? parseFloat(String(h.price_usd)) : 0);
                            }, 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.assignmentActions}>
                  <Button
                    variant="primary"
                    onClick={handleSaveAssignments}
                    disabled={saving || !hasChanges()}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Assignments'}
                  </Button>
                  
                  {Object.keys(existingAssignments).length > 0 && (
                    <Button
                      variant="danger"
                      onClick={handleClearAllAssignments}
                      disabled={saving}
                    >
                      <Trash2 size={16} />
                      Clear All Assignments
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Placeholder when no event selected */}
            {!selectedEvent && (
              <Card className={styles.placeholderCard}>
                <div className={styles.placeholder}>
                  <Ticket size={64} className={styles.placeholderIcon} />
                  <h3>No Event Selected</h3>
                  <p>Select an event from the dropdowns above to assign hospitality services</p>
                </div>
              </Card>
            )}

            {/* No hospitalities warning */}
            {activeHospitalities.length === 0 && selectedEvent && (
              <Card className={styles.warningCard}>
                <div className={styles.warning}>
                  <Coffee size={48} />
                  <h3>No Active Hospitality Services</h3>
                  <p>Create and activate hospitality services in the "Manage Services" tab first</p>
                  <Button variant="primary" onClick={() => setViewMode('services')}>
                    Go to Manage Services
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HospitalityManagement;
