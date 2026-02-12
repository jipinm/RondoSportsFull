import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Save, Trash2, RefreshCw, Edit2, X, Check, Layers, ChevronRight } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import {
  markupRuleService,
  type MarkupRule,
  type MarkupRuleInput,
  type MarkupType,
  type MarkupLevel,
} from '../services/markupRuleService';
import styles from './HierarchicalMarkupManager.module.css';

// Helper to get current season
const getCurrentSeason = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 7) {
    return `${year.toString().slice(-2)}/${(year + 1).toString().slice(-2)}`;
  } else {
    return `${(year - 1).toString().slice(-2)}/${year.toString().slice(-2)}`;
  }
};

// Types for XS2Event API
interface Sport {
  sport_type: string;
  name: string;
  has_teams: boolean;
}

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

// Known sports and their team support - used as fallback
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

const LEVEL_LABELS: Record<MarkupLevel, string> = {
  sport: 'Sport Level',
  tournament: 'Tournament Level',
  team: 'Team Level',
  event: 'Event Level',
  ticket: 'Ticket Category Level',
};

const LEVEL_DESCRIPTIONS: Record<MarkupLevel, string> = {
  sport: 'Applies to ALL events and tickets under this sport type',
  tournament: 'Applies to all events and tickets under this specific tournament',
  team: 'Applies to all events and tickets for this specific team',
  event: 'Applies to all tickets under this specific event',
  ticket: 'Applies only to this specific ticket category',
};

const HierarchicalMarkupManager: React.FC = () => {
  // Sport & hierarchy selection
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

  // The level at which the user wants to set markup
  const [targetLevel, setTargetLevel] = useState<MarkupLevel>('sport');

  // Markup form
  const [markupType, setMarkupType] = useState<MarkupType>('fixed');
  const [markupAmount, setMarkupAmount] = useState<string>('');

  // Existing rules
  const [existingRules, setExistingRules] = useState<MarkupRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<{
    markup_type: MarkupType;
    markup_amount: string;
  }>({ markup_type: 'fixed', markup_amount: '' });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // USD conversion rates for ticket prices
  const [exchangeRates, setExchangeRates] = useState<Map<string, number>>(new Map());
  const [ratesLoading, setRatesLoading] = useState(false);

  const { toasts, closeToast, success, error } = useToast();

  // Fetch sports from API
  const fetchSports = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://testapi.xs2event.com';
      const apiKey = import.meta.env.VITE_XS2EVENT_API_KEY;

      const response = await fetch(`${baseUrl}/v1/sports`, {
        headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        // The API may return sports under different keys: data.sports, data.data, or data itself
        const rawSports: any[] = data.sports || data.data || (Array.isArray(data) ? data : []);
        if (rawSports.length > 0) {
          const fetchedSports: Sport[] = rawSports
            .map((s: any) => ({
              sport_type: s.sport_type || s.slug || s.name?.toLowerCase()?.replace(/\s+/g, '_') || '',
              name: s.name || s.sport_type || s.slug || '',
              has_teams: s.has_teams ?? KNOWN_SPORTS.find(k => k.sport_type === (s.sport_type || s.slug))?.has_teams ?? true,
            }))
            .filter((s) => s.sport_type && s.name); // Only keep sports with valid identifiers and names
          if (fetchedSports.length > 0) {
            setSports(fetchedSports);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sports:', err);
      // Fallback to KNOWN_SPORTS (already set as default)
    }
  }, []);

  // Fetch tournaments for selected sport
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

  // Fetch teams for selected tournament
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

  // Fetch events
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

  // Fetch USD exchange rates for ticket currencies via Frankfurter API
  const fetchExchangeRates = useCallback(async (ticketList: XS2Ticket[]) => {
    const currencies = [...new Set(ticketList.map(t => t.currency_code).filter(c => c && c !== 'USD'))];
    if (currencies.length === 0) {
      setExchangeRates(new Map([['USD', 1]]));
      return;
    }

    setRatesLoading(true);
    const rates = new Map<string, number>();
    rates.set('USD', 1);

    try {
      const results = await Promise.all(
        currencies.map(async (currency) => {
          try {
            const res = await fetch(
              `https://api.frankfurter.dev/v1/latest?from=${currency}&to=USD`
            );
            if (!res.ok) return { currency, rate: null };
            const data = await res.json();
            return { currency, rate: data.rates?.USD ?? null };
          } catch {
            return { currency, rate: null };
          }
        })
      );
      results.forEach(({ currency, rate }) => {
        if (rate !== null) rates.set(currency, rate);
      });
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
    } finally {
      setExchangeRates(rates);
      setRatesLoading(false);
    }
  }, []);

  // Fetch tickets
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
      // Fetch USD exchange rates for the ticket currencies
      if (ticketList.length > 0) {
        fetchExchangeRates(ticketList);
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      error('Failed to load tickets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error, fetchExchangeRates]);

  const convertToUsd = (amount: number, currency: string): string | null => {
    if (currency === 'USD') return amount.toFixed(2);
    const rate = exchangeRates.get(currency);
    if (!rate) return null;
    return (amount * rate).toFixed(2);
  };

  // Fetch existing markup rules
  const fetchExistingRules = useCallback(async () => {
    try {
      const response = await markupRuleService.getAllRules({ per_page: 100 });
      setExistingRules(response.data);
    } catch (err: any) {
      console.error('Error fetching rules:', err);
      setExistingRules([]);
    }
  }, []);

  // Selection handlers
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
    setMarkupAmount('');

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
    setMarkupAmount('');

    if (tournament && selectedSport) {
      if (selectedSport.has_teams) {
        await fetchTeams(selectedSport.sport_type, tournamentId);
      } else {
        // Non-team sports: go directly to events
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
    setMarkupAmount('');

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
    setMarkupAmount('');

    if (event) {
      await fetchTickets(event.event_id);
    }
  };

  const handleTicketSelect = (ticketId: string) => {
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    setSelectedTicket(ticket || null);
    setTargetLevel('ticket');
    setMarkupAmount('');
  };

  // Determine available levels based on selection
  const getAvailableLevels = (): MarkupLevel[] => {
    const levels: MarkupLevel[] = [];
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

  // Save markup rule
  const handleSaveRule = async () => {
    if (!selectedSport) {
      error('Please select a sport');
      return;
    }

    const amount = parseFloat(markupAmount);
    if (isNaN(amount) || amount < 0) {
      error('Please enter a valid markup amount');
      return;
    }

    // Validate target level matches selection
    if (targetLevel === 'tournament' && !selectedTournament) {
      error('Please select a tournament for tournament-level markup');
      return;
    }
    if (targetLevel === 'team' && !selectedTeam) {
      error('Please select a team for team-level markup');
      return;
    }
    if (targetLevel === 'event' && !selectedEvent) {
      error('Please select an event for event-level markup');
      return;
    }
    if (targetLevel === 'ticket' && !selectedTicket) {
      error('Please select a ticket for ticket-level markup');
      return;
    }

    setSaving(true);
    try {
      const input: MarkupRuleInput = {
        sport_type: selectedSport.sport_type,
        markup_type: markupType,
        markup_amount: amount,
        sport_name: selectedSport.name,
      };

      // Set hierarchy IDs based on target level
      if (targetLevel !== 'sport' && selectedTournament) {
        input.tournament_id = selectedTournament.tournament_id;
        input.tournament_name = selectedTournament.official_name || selectedTournament.name;
      }
      if (['team', 'event', 'ticket'].includes(targetLevel) && selectedTeam) {
        input.team_id = selectedTeam.team_id;
        input.team_name = selectedTeam.official_name || selectedTeam.name;
      }
      if (['event', 'ticket'].includes(targetLevel) && selectedEvent) {
        input.event_id = selectedEvent.event_id;
        input.event_name = selectedEvent.event_name;
      }
      if (targetLevel === 'ticket' && selectedTicket) {
        input.ticket_id = selectedTicket.ticket_id;
        input.ticket_name = selectedTicket.ticket_title;
      }

      await markupRuleService.createOrUpdateRule(input);
      success(`Markup rule saved at ${LEVEL_LABELS[targetLevel]}`);
      setMarkupAmount('');
      await fetchExistingRules();
    } catch (err: any) {
      console.error('Error saving rule:', err);
      error('Failed to save markup rule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit handlers
  const handleStartEdit = (rule: MarkupRule) => {
    setEditingRuleId(rule.id);
    setEditingValues({
      markup_type: rule.markup_type,
      markup_amount: String(rule.markup_amount),
    });
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setEditingValues({ markup_type: 'fixed', markup_amount: '' });
  };

  const handleSaveEdit = async () => {
    if (editingRuleId === null) return;

    setSaving(true);
    try {
      await markupRuleService.updateRule(editingRuleId, {
        markup_type: editingValues.markup_type,
        markup_amount: parseFloat(editingValues.markup_amount) || 0,
      });

      success('Markup rule updated');
      handleCancelEdit();
      await fetchExistingRules();
    } catch (err: any) {
      console.error('Error updating rule:', err);
      error('Failed to update rule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this markup rule?')) return;

    try {
      await markupRuleService.deleteRule(ruleId);
      setExistingRules(prev => prev.filter(r => r.id !== ruleId));
      success('Markup rule deleted');
    } catch (err: any) {
      console.error('Error deleting rule:', err);
      error('Failed to delete rule: ' + err.message);
    }
  };

  // Level badge color
  const getLevelColor = (level: MarkupLevel): string => {
    switch (level) {
      case 'sport': return '#8b5cf6';
      case 'tournament': return '#3b82f6';
      case 'team': return '#10b981';
      case 'event': return '#f59e0b';
      case 'ticket': return '#ef4444';
      default: return '#64748b';
    }
  };

  useEffect(() => {
    fetchSports();
    fetchExistingRules();
  }, [fetchSports, fetchExistingRules]);

  const availableLevels = getAvailableLevels();
  const breadcrumb = getBreadcrumb();
  const hasTeams = selectedSport?.has_teams ?? true;

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

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
            Skip this to apply markup at the sport level to all {selectedSport.name} events
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

      {/* Step 3: Team Selection (only for team sports) */}
      {selectedTournament && hasTeams && (
        <Card className={styles.selectionCard}>
          <h2 className={styles.cardTitle}>Step 3: Select Team (Optional)</h2>
          <p className={styles.helpText}>
            Skip this to apply markup at the tournament level
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

      {/* Step for Event (for non-team sports after tournament, or after team) */}
      {((selectedTournament && !hasTeams) || selectedTeam) && (
        <Card className={styles.selectionCard}>
          <h2 className={styles.cardTitle}>
            Step {hasTeams ? '4' : '3'}: Select Event (Optional)
          </h2>
          <p className={styles.helpText}>
            Skip this to apply markup at the {selectedTeam ? 'team' : 'tournament'} level
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

      {/* Step for Ticket (after event) */}
      {selectedEvent && (
        <Card className={styles.selectionCard}>
          <h2 className={styles.cardTitle}>
            Step {hasTeams ? '5' : '4'}: Select Ticket Category (Optional)
          </h2>
          <p className={styles.helpText}>
            Skip this to apply markup at the event level to all tickets
          </p>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={selectedTicket?.ticket_id || ''}
              onChange={(e) => handleTicketSelect(e.target.value)}
              disabled={loading || tickets.length === 0}
            >
              <option value="">-- Select Ticket (optional) --</option>
              {tickets.map(t => {
                const localPrice = (t.face_value / 100).toFixed(2);
                const usdPrice = convertToUsd(t.face_value / 100, t.currency_code);
                const usdLabel = t.currency_code === 'USD'
                  ? ''
                  : usdPrice
                    ? ` ≈ USD ${usdPrice}`
                    : ratesLoading ? ' (loading USD...)' : '';
                return (
                  <option key={t.ticket_id} value={t.ticket_id}>
                    {t.ticket_title} ({t.currency_code} {localPrice}{usdLabel})
                  </option>
                );
              })}
            </select>
          </div>
          {loading && tickets.length === 0 && (
            <div className={styles.loading}>Loading tickets...</div>
          )}
        </Card>
      )}

      {/* Breadcrumb & Level Selection */}
      {selectedSport && (
        <Card className={styles.configCard}>
          <h2 className={styles.cardTitle}>
            <Layers size={20} />
            Set Markup Rule
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
            <label className={styles.label}>Apply markup at:</label>
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

          {/* Markup Configuration */}
          <div className={styles.markupForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Markup Type</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="hierarchicalMarkupType"
                      value="fixed"
                      checked={markupType === 'fixed'}
                      onChange={() => setMarkupType('fixed')}
                    />
                    Fixed Amount ($)
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="hierarchicalMarkupType"
                      value="percentage"
                      checked={markupType === 'percentage'}
                      onChange={() => setMarkupType('percentage')}
                    />
                    Percentage (%)
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {markupType === 'percentage' ? 'Markup Percentage (%)' : 'Markup Amount (USD)'}
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>
                    {markupType === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={markupType === 'percentage' ? '0.1' : '0.01'}
                    max={markupType === 'percentage' ? '1000' : undefined}
                    placeholder={markupType === 'percentage' ? '10' : '50.00'}
                    value={markupAmount}
                    onChange={(e) => setMarkupAmount(e.target.value)}
                    className={styles.markupInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <Button
                variant="primary"
                onClick={handleSaveRule}
                disabled={saving || !markupAmount || parseFloat(markupAmount) < 0}
              >
                <Save size={16} />
                {saving ? 'Saving...' : `Save ${LEVEL_LABELS[targetLevel]} Markup`}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Markup Rules */}
      <Card className={styles.existingCard}>
        <div className={styles.existingHeader}>
          <h2 className={styles.cardTitle}>
            Existing Hierarchical Markup Rules ({existingRules.length})
          </h2>
          <Button variant="ghost" onClick={fetchExistingRules} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            Refresh
          </Button>
        </div>

        {existingRules.length === 0 ? (
          <div className={styles.noData}>
            No hierarchical markup rules configured yet. Use the form above to create rules at any level.
          </div>
        ) : (
          <div className={styles.rulesTable}>
            <div className={styles.rulesTableHeader}>
              <div>Level</div>
              <div>Scope</div>
              <div>Type</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Updated</div>
              <div>Actions</div>
            </div>

            <div className={styles.rulesTableBody}>
              {existingRules.map(rule => (
                <div key={rule.id} className={styles.ruleRow}>
                  <div>
                    <span
                      className={styles.levelBadge}
                      style={{ backgroundColor: getLevelColor(rule.level), color: '#fff' }}
                    >
                      {rule.level.charAt(0).toUpperCase() + rule.level.slice(1)}
                    </span>
                  </div>

                  <div className={styles.scopeCell}>
                    {rule.sport_name && <span className={styles.scopeItem}>{rule.sport_name}</span>}
                    {rule.tournament_name && (
                      <>
                        <ChevronRight size={12} />
                        <span className={styles.scopeItem}>{rule.tournament_name}</span>
                      </>
                    )}
                    {rule.team_name && (
                      <>
                        <ChevronRight size={12} />
                        <span className={styles.scopeItem}>{rule.team_name}</span>
                      </>
                    )}
                    {rule.event_name && (
                      <>
                        <ChevronRight size={12} />
                        <span className={styles.scopeItem}>{rule.event_name}</span>
                      </>
                    )}
                    {rule.ticket_name && (
                      <>
                        <ChevronRight size={12} />
                        <span className={styles.scopeItem}>{rule.ticket_name}</span>
                      </>
                    )}
                  </div>

                  {editingRuleId === rule.id ? (
                    <>
                      <div>
                        <select
                          className={styles.editSelect}
                          value={editingValues.markup_type}
                          onChange={(e) => setEditingValues(prev => ({
                            ...prev,
                            markup_type: e.target.value as MarkupType
                          }))}
                          disabled={saving}
                        >
                          <option value="fixed">Fixed ($)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingValues.markup_amount}
                          onChange={(e) => setEditingValues(prev => ({
                            ...prev,
                            markup_amount: e.target.value
                          }))}
                          className={styles.editInput}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <span className={rule.is_active ? styles.statusActive : styles.statusInactive}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className={styles.timestamp}>
                        {new Date(rule.updated_at).toLocaleString()}
                      </div>
                      <div className={styles.rowActions}>
                        <button
                          className={`${styles.actionBtn} ${styles.saveBtn}`}
                          onClick={handleSaveEdit}
                          disabled={saving}
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.cancelBtn}`}
                          onClick={handleCancelEdit}
                          disabled={saving}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        {rule.markup_type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </div>
                      <div className={styles.amountCell}>
                        {rule.markup_type === 'percentage'
                          ? `${rule.markup_amount}%`
                          : `$${Number(rule.markup_amount).toFixed(2)}`}
                      </div>
                      <div>
                        <span className={rule.is_active ? styles.statusActive : styles.statusInactive}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className={styles.timestamp}>
                        {new Date(rule.updated_at).toLocaleString()}
                      </div>
                      <div className={styles.rowActions}>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleStartEdit(rule)}
                          disabled={saving || editingRuleId !== null}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={saving}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Priority Info */}
      <Card className={styles.infoCard}>
        <h2 className={styles.cardTitle}>
          <DollarSign size={20} />
          Markup Priority Rules
        </h2>
        <div className={styles.priorityList}>
          <div className={styles.priorityItem}>
            <span className={styles.priorityBadge} style={{ backgroundColor: '#ef4444' }}>1</span>
            <div>
              <strong>Ticket Category Level</strong> — Most specific. Uses the existing Ticket Markup Pricing tab for per-ticket markups.
            </div>
          </div>
          <div className={styles.priorityItem}>
            <span className={styles.priorityBadge} style={{ backgroundColor: '#f59e0b' }}>2</span>
            <div>
              <strong>Event Level</strong> — Applies to all tickets under a specific event.
            </div>
          </div>
          <div className={styles.priorityItem}>
            <span className={styles.priorityBadge} style={{ backgroundColor: '#10b981' }}>3</span>
            <div>
              <strong>Team Level</strong> — Applies to all events/tickets for a team (team sports only).
            </div>
          </div>
          <div className={styles.priorityItem}>
            <span className={styles.priorityBadge} style={{ backgroundColor: '#3b82f6' }}>4</span>
            <div>
              <strong>Tournament Level</strong> — Applies to all events/tickets in a tournament.
            </div>
          </div>
          <div className={styles.priorityItem}>
            <span className={styles.priorityBadge} style={{ backgroundColor: '#8b5cf6' }}>5</span>
            <div>
              <strong>Sport Level</strong> — Least specific. Applies to ALL events/tickets under a sport type.
            </div>
          </div>
        </div>
        <p className={styles.priorityNote}>
          If a more specific markup exists, it overrides less specific ones. For example, a ticket-level markup overrides an event-level markup.
        </p>
      </Card>
    </div>
  );
};

export default HierarchicalMarkupManager;
