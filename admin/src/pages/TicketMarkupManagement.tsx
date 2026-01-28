import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, Save, Trash2, RefreshCw, Edit2, X, Check } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import { ticketMarkupService, type TicketMarkup, type MarkupType } from '../services/ticketMarkupService';
import styles from './TicketMarkupManagement.module.css';

// Helper to get current season (e.g., "25/26")
const getCurrentSeason = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  // Season starts in August (month 7)
  if (month >= 7) {
    // Aug-Dec: use current year and next year
    const currentYearShort = year.toString().slice(-2);
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${currentYearShort}/${nextYearShort}`;
  } else {
    // Jan-Jul: use previous year and current year
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

// Currency conversion hook
const useCurrencyConversion = (fromCurrency: string, toCurrency: string = 'USD') => {
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (fromCurrency === toCurrency) {
        setExchangeRate(1);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.frankfurter.dev/v1/latest?from=${fromCurrency}&to=${toCurrency}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rate');
        }

        const data = await response.json();
        setExchangeRate(data.rates[toCurrency] || 1);
      } catch (err) {
        console.error('Currency conversion error:', err);
        setError('Failed to load exchange rate');
        setExchangeRate(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRate();
  }, [fromCurrency, toCurrency]);

  const convertAmount = useCallback((amount: number) => {
    return amount * exchangeRate;
  }, [exchangeRate]);

  return { convertAmount, exchangeRate, isLoading, error };
};

const TicketMarkupManagement: React.FC = () => {
  // Selection states - hierarchical
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<XS2Event[]>([]);
  const [tickets, setTickets] = useState<XS2Ticket[]>([]);
  
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<XS2Event | null>(null);
  
  const [existingMarkups, setExistingMarkups] = useState<TicketMarkup[]>([]);
  const [ticketMarkups, setTicketMarkups] = useState<Record<string, string>>({});
  const [ticketMarkupTypes, setTicketMarkupTypes] = useState<Record<string, MarkupType>>({});
  const [ticketMarkupPercentages, setTicketMarkupPercentages] = useState<Record<string, string>>({});
  const [globalMarkupType, setGlobalMarkupType] = useState<MarkupType>('fixed');
  const [applyToAll, setApplyToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editing state for existing markups
  const [editingMarkupId, setEditingMarkupId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<{
    markup_price_usd: string;
    markup_type: MarkupType;
    markup_percentage: string;
    base_price_usd: string;
    final_price_usd: string;
  }>({ markup_price_usd: '', markup_type: 'fixed', markup_percentage: '', base_price_usd: '', final_price_usd: '' });
  const [deletingMarkupId, setDeletingMarkupId] = useState<number | null>(null);
  
  const { toasts, closeToast, success, error } = useToast();

  // Currency conversion
  const sourceCurrency = tickets[0]?.currency_code || 'EUR';
  const { convertAmount, exchangeRate, isLoading: conversionLoading } = useCurrencyConversion(sourceCurrency, 'USD');

  // Step 1: Fetch tournaments
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

      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }

      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      error('Failed to load tournaments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Step 2: Fetch teams for selected tournament
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

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      error('Failed to load teams: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Step 3: Fetch events for selected team (and tournament)
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

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('Events API Response:', data);
      setEvents(data.events || data.data?.events || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      error('Failed to load events: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Step 4: Fetch tickets for selected event
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

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Tickets API Response:', data);
      const ticketsArray = data.tickets || data.data?.tickets || [];
      console.log('Tickets found:', ticketsArray.length);
      setTickets(ticketsArray);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      error('Failed to load tickets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Fetch existing markups for event
  const fetchExistingMarkups = useCallback(async (eventId: string) => {
    try {
      const markups = await ticketMarkupService.getMarkupsByEvent(eventId);
      setExistingMarkups(markups);
    } catch (err: any) {
      console.error('Error fetching markups:', err);
      // Don't show error if no markups exist yet
      setExistingMarkups([]);
    }
  }, []);

  // Selection handlers for hierarchical flow
  const handleTournamentSelect = async (tournamentId: string) => {
    const tournament = tournaments.find(t => t.tournament_id === tournamentId);
    setSelectedTournament(tournament || null);
    setSelectedTeam(null);
    setSelectedEvent(null);
    setTeams([]);
    setEvents([]);
    setTickets([]);
    setExistingMarkups([]);
    setTicketMarkups({});
    setTicketMarkupTypes({});
    setTicketMarkupPercentages({});
    setApplyToAll(false);

    if (tournament) {
      await fetchTeams(tournamentId);
    }
  };

  const handleTeamSelect = async (teamId: string) => {
    const team = teams.find(t => t.team_id === teamId);
    setSelectedTeam(team || null);
    setSelectedEvent(null);
    setEvents([]);
    setTickets([]);
    setExistingMarkups([]);
    setTicketMarkups({});
    setTicketMarkupTypes({});
    setTicketMarkupPercentages({});
    setApplyToAll(false);

    if (team && selectedTournament) {
      await fetchEvents(selectedTournament.tournament_id, teamId);
    }
  };

  const handleEventSelect = async (eventId: string) => {
    console.log('handleEventSelect called with eventId:', eventId);
    const event = events.find(e => e.event_id === eventId);
    console.log('Found event:', event);
    setSelectedEvent(event || null);
    setTickets([]);
    setExistingMarkups([]);
    setTicketMarkups({});
    setTicketMarkupTypes({});
    setTicketMarkupPercentages({});
    setApplyToAll(false);

    if (event) {
      console.log('Fetching tickets for event:', event.event_id);
      await Promise.all([
        fetchTickets(event.event_id),
        fetchExistingMarkups(event.event_id)
      ]);
    }
  };

  // Handle individual ticket markup change (for fixed amount)
  const handleTicketMarkupChange = (ticketId: string, value: string) => {
    if (applyToAll) {
      // Apply this value to all tickets
      const newMarkups: Record<string, string> = {};
      tickets.forEach(ticket => {
        newMarkups[ticket.ticket_id] = value;
      });
      setTicketMarkups(newMarkups);
    } else {
      setTicketMarkups(prev => ({
        ...prev,
        [ticketId]: value
      }));
    }
  };

  // Handle individual ticket markup type change
  const handleTicketMarkupTypeChange = (ticketId: string, type: MarkupType) => {
    if (applyToAll) {
      const newTypes: Record<string, MarkupType> = {};
      tickets.forEach(ticket => {
        newTypes[ticket.ticket_id] = type;
      });
      setTicketMarkupTypes(newTypes);
      setGlobalMarkupType(type);
    } else {
      setTicketMarkupTypes(prev => ({
        ...prev,
        [ticketId]: type
      }));
    }
  };

  // Handle individual ticket markup percentage change
  const handleTicketMarkupPercentageChange = (ticketId: string, value: string) => {
    if (applyToAll) {
      const newPercentages: Record<string, string> = {};
      tickets.forEach(ticket => {
        newPercentages[ticket.ticket_id] = value;
      });
      setTicketMarkupPercentages(newPercentages);
    } else {
      setTicketMarkupPercentages(prev => ({
        ...prev,
        [ticketId]: value
      }));
    }
  };

  // Handle "Apply to all" checkbox change
  const handleApplyToAllChange = (checked: boolean) => {
    setApplyToAll(checked);
    if (checked && tickets.length > 0) {
      // Get the first ticket's values and apply to all
      const firstTicketId = tickets[0].ticket_id;
      const firstMarkup = ticketMarkups[firstTicketId] || '';
      const firstType = ticketMarkupTypes[firstTicketId] || globalMarkupType;
      const firstPercentage = ticketMarkupPercentages[firstTicketId] || '';
      
      if (firstMarkup || firstPercentage) {
        const newMarkups: Record<string, string> = {};
        const newTypes: Record<string, MarkupType> = {};
        const newPercentages: Record<string, string> = {};
        tickets.forEach(ticket => {
          newMarkups[ticket.ticket_id] = firstMarkup;
          newTypes[ticket.ticket_id] = firstType;
          newPercentages[ticket.ticket_id] = firstPercentage;
        });
        setTicketMarkups(newMarkups);
        setTicketMarkupTypes(newTypes);
        setTicketMarkupPercentages(newPercentages);
      }
    }
  };

  // Get markup value for a ticket (considering applyToAll)
  const getTicketMarkup = (ticketId: string): string => {
    return ticketMarkups[ticketId] || '';
  };

  // Calculate final prices
  const calculatePrices = useCallback(() => {
    if (!tickets.length) return [];

    return tickets.map(ticket => {
      // face_value is in cents, convert to dollars first
      const faceValueDollars = ticket.face_value / 100;
      const basePriceUsd = convertAmount(faceValueDollars);
      
      // Determine markup type for this ticket
      const markupType = ticketMarkupTypes[ticket.ticket_id] || globalMarkupType;
      
      let markup = 0;
      let markupPercentage: number | null = null;
      
      if (markupType === 'percentage') {
        // Calculate markup from percentage
        markupPercentage = parseFloat(ticketMarkupPercentages[ticket.ticket_id]) || 0;
        markup = basePriceUsd * (markupPercentage / 100);
      } else {
        // Fixed amount markup
        markup = parseFloat(ticketMarkups[ticket.ticket_id]) || 0;
      }
      
      const finalPriceUsd = basePriceUsd + markup;

      return {
        ticket_id: ticket.ticket_id,
        ticket_title: ticket.ticket_title,
        original_price: faceValueDollars,
        original_currency: ticket.currency_code,
        base_price_usd: basePriceUsd,
        markup_type: markupType,
        markup_percentage: markupPercentage,
        markup_price_usd: markup,
        final_price_usd: finalPriceUsd,
      };
    });
  }, [tickets, ticketMarkups, ticketMarkupTypes, ticketMarkupPercentages, globalMarkupType, convertAmount]);

  // Check if any markup is set (fixed or percentage)
  const hasAnyMarkup = Object.values(ticketMarkups).some(v => v && parseFloat(v) >= 0) ||
    Object.values(ticketMarkupPercentages).some(v => v && parseFloat(v) >= 0);

  // Save markup prices
  const handleSaveMarkup = async () => {
    if (!selectedEvent) {
      error('Please select an event');
      return;
    }

    if (!hasAnyMarkup) {
      error('Please enter markup amounts for at least one ticket');
      return;
    }

    if (!tickets.length) {
      error('No tickets available for this event');
      return;
    }

    setSaving(true);
    try {
      const prices = calculatePrices();
      const ticketsData = prices
        .filter(p => p.markup_price_usd >= 0)
        .map(p => ({
          ticket_id: p.ticket_id,
          markup_price_usd: p.markup_price_usd,
          markup_type: p.markup_type,
          markup_percentage: p.markup_percentage,
          base_price_usd: p.base_price_usd,
          final_price_usd: p.final_price_usd,
        }));

      const result = await ticketMarkupService.batchUpsertMarkups({
        event_id: selectedEvent.event_id,
        tickets: ticketsData,
      });

      success(result.data.message);
      await fetchExistingMarkups(selectedEvent.event_id);
    } catch (err: any) {
      console.error('Error saving markup:', err);
      error('Failed to save markup: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete all markups for event
  const handleDeleteMarkups = async () => {
    if (!selectedEvent) return;

    if (!confirm('Are you sure you want to delete all markup pricing for this event?')) {
      return;
    }

    setSaving(true);
    try {
      const deletedCount = await ticketMarkupService.deleteMarkupsByEvent(selectedEvent.event_id);
      success(`Deleted ${deletedCount} markup(s)`);
      setExistingMarkups([]);
      setTicketMarkups({});
      setApplyToAll(false);
    } catch (err: any) {
      console.error('Error deleting markups:', err);
      error('Failed to delete markups: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Start editing a single markup entry
  const handleStartEdit = (markup: TicketMarkup) => {
    setEditingMarkupId(markup.id);
    setEditingValues({
      markup_price_usd: String(parseFloat(String(markup.markup_price_usd))),
      markup_type: markup.markup_type || 'fixed',
      markup_percentage: markup.markup_percentage ? String(markup.markup_percentage) : '',
      base_price_usd: String(parseFloat(String(markup.base_price_usd))),
      final_price_usd: String(parseFloat(String(markup.final_price_usd))),
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMarkupId(null);
    setEditingValues({ markup_price_usd: '', markup_type: 'fixed', markup_percentage: '', base_price_usd: '', final_price_usd: '' });
  };

  // Update editing values and recalculate final price
  const handleEditValueChange = (field: 'markup_price_usd' | 'markup_type' | 'markup_percentage' | 'base_price_usd', value: string) => {
    const newValues = { ...editingValues };
    
    if (field === 'markup_type') {
      newValues.markup_type = value as MarkupType;
    } else {
      (newValues as any)[field] = value;
    }
    
    // Recalculate final price based on markup type
    const basePrice = parseFloat(newValues.base_price_usd) || 0;
    let markupAmount = 0;
    
    if (newValues.markup_type === 'percentage') {
      const percentage = parseFloat(newValues.markup_percentage) || 0;
      markupAmount = basePrice * (percentage / 100);
      newValues.markup_price_usd = String(markupAmount);
    } else {
      markupAmount = parseFloat(newValues.markup_price_usd) || 0;
    }
    
    newValues.final_price_usd = String(basePrice + markupAmount);
    
    setEditingValues(newValues);
  };

  // Save edited markup
  const handleSaveEdit = async () => {
    if (editingMarkupId === null) return;

    setSaving(true);
    try {
      const updatedMarkup = await ticketMarkupService.updateMarkup(editingMarkupId, {
        markup_price_usd: parseFloat(editingValues.markup_price_usd) || 0,
        markup_type: editingValues.markup_type,
        markup_percentage: editingValues.markup_type === 'percentage' 
          ? parseFloat(editingValues.markup_percentage) || 0 
          : null,
        base_price_usd: parseFloat(editingValues.base_price_usd) || 0,
        final_price_usd: parseFloat(editingValues.final_price_usd) || 0,
      });

      // Update the local state
      setExistingMarkups(prev => 
        prev.map(m => m.id === editingMarkupId ? updatedMarkup : m)
      );

      success('Markup updated successfully');
      handleCancelEdit();
    } catch (err: any) {
      console.error('Error updating markup:', err);
      error('Failed to update markup: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete a single markup entry
  const handleDeleteSingleMarkup = async (markupId: number) => {
    if (!confirm('Are you sure you want to delete this markup entry?')) {
      return;
    }

    setDeletingMarkupId(markupId);
    try {
      await ticketMarkupService.deleteMarkupById(markupId);
      
      // Remove from local state
      setExistingMarkups(prev => prev.filter(m => m.id !== markupId));
      
      // Clear the ticket markup input if it matches
      const deletedMarkup = existingMarkups.find(m => m.id === markupId);
      if (deletedMarkup) {
        setTicketMarkups(prev => {
          const newMarkups = { ...prev };
          delete newMarkups[deletedMarkup.ticket_id];
          return newMarkups;
        });
      }

      success('Markup deleted successfully');
    } catch (err: any) {
      console.error('Error deleting markup:', err);
      error('Failed to delete markup: ' + err.message);
    } finally {
      setDeletingMarkupId(null);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const calculatedPrices = calculatePrices();

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <DollarSign size={32} />
            Ticket Markup Pricing
          </h1>
          <p className={styles.subtitle}>
            Set markup prices for event tickets. All prices are converted to and stored in USD.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={fetchTournaments} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Step 1: Tournament Selection */}
        <Card className={styles.selectionCard}>
          <h2 className={styles.cardTitle}>Step 1: Select Tournament</h2>
          
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={selectedTournament?.tournament_id || ''}
              onChange={(e) => handleTournamentSelect(e.target.value)}
              disabled={loading || tournaments.length === 0}
            >
              <option value="">-- Select Tournament --</option>
              {tournaments.map(tournament => (
                <option key={tournament.tournament_id} value={tournament.tournament_id}>
                  {tournament.official_name || tournament.name}
                </option>
              ))}
            </select>
          </div>

          {loading && tournaments.length === 0 && (
            <div className={styles.loading}>Loading tournaments...</div>
          )}
        </Card>

        {/* Step 2: Team Selection */}
        {selectedTournament && (
          <Card className={styles.selectionCard}>
            <h2 className={styles.cardTitle}>Step 2: Select Team</h2>
            
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedTeam?.team_id || ''}
                onChange={(e) => handleTeamSelect(e.target.value)}
                disabled={loading || teams.length === 0}
              >
                <option value="">-- Select Team --</option>
                {teams.map(team => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.official_name || team.name}
                  </option>
                ))}
              </select>
            </div>

            {loading && teams.length === 0 && selectedTournament && (
              <div className={styles.loading}>Loading teams...</div>
            )}
          </Card>
        )}

        {/* Step 3: Event Selection */}
        {selectedTeam && (
          <Card className={styles.selectionCard}>
            <h2 className={styles.cardTitle}>Step 3: Select Event</h2>
            
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedEvent?.event_id || ''}
                onChange={(e) => handleEventSelect(e.target.value)}
                disabled={loading || events.length === 0}
              >
                <option value="">-- Select Event --</option>
                {events.map(event => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.event_name} - {event.venue_name} - {new Date(event.date_start).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {loading && events.length === 0 && selectedTeam && (
              <div className={styles.loading}>Loading events...</div>
            )}
          </Card>
        )}

        {/* Loading tickets indicator */}
        {selectedEvent && loading && tickets.length === 0 && (
          <Card className={styles.selectionCard}>
            <div className={styles.loading}>Loading tickets...</div>
          </Card>
        )}

        {/* No tickets message */}
        {selectedEvent && !loading && tickets.length === 0 && (
          <Card className={styles.selectionCard}>
            <div className={styles.noData}>
              No tickets available for this event. Please select a different event.
            </div>
          </Card>
        )}

        {/* Markup Configuration */}
        {selectedEvent && tickets.length > 0 && (
          <>
            <Card className={styles.configCard}>
              <h2 className={styles.cardTitle}>
                Step 4: Set Markup Prices (USD)
              </h2>
              
              <div className={styles.markupConfig}>
                {/* Global Markup Type Selection */}
                <div className={styles.globalMarkupType}>
                  <label className={styles.smallLabel}>Default Markup Type:</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="globalMarkupType"
                        value="fixed"
                        checked={globalMarkupType === 'fixed'}
                        onChange={() => {
                          setGlobalMarkupType('fixed');
                          if (applyToAll) {
                            const newTypes: Record<string, MarkupType> = {};
                            tickets.forEach(ticket => {
                              newTypes[ticket.ticket_id] = 'fixed';
                            });
                            setTicketMarkupTypes(newTypes);
                          }
                        }}
                      />
                      Fixed Amount ($)
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="globalMarkupType"
                        value="percentage"
                        checked={globalMarkupType === 'percentage'}
                        onChange={() => {
                          setGlobalMarkupType('percentage');
                          if (applyToAll) {
                            const newTypes: Record<string, MarkupType> = {};
                            tickets.forEach(ticket => {
                              newTypes[ticket.ticket_id] = 'percentage';
                            });
                            setTicketMarkupTypes(newTypes);
                          }
                        }}
                      />
                      Percentage (%)
                    </label>
                  </div>
                </div>

                {/* Apply to All Checkbox */}
                <div className={styles.applyAllWrapper}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => handleApplyToAllChange(e.target.checked)}
                      className={styles.checkbox}
                    />
                    Apply same markup to all tickets
                  </label>
                  <p className={styles.helpText}>
                    When checked, changing any ticket's markup will apply the same value to all tickets
                  </p>
                </div>

                {conversionLoading && (
                  <div className={styles.conversionInfo}>
                    Loading exchange rate...
                  </div>
                )}

                {exchangeRate !== 1 && !conversionLoading && (
                  <div className={styles.conversionInfo}>
                    <TrendingUp size={16} />
                    Exchange Rate: 1 {sourceCurrency} = ${exchangeRate.toFixed(4)} USD
                  </div>
                )}

                {/* Individual Ticket Markups */}
                <div className={styles.ticketMarkupList}>
                  {tickets.map((ticket, index) => {
                    // face_value is in cents, convert to dollars first
                    const faceValueDollars = ticket.face_value / 100;
                    const basePriceUsd = convertAmount(faceValueDollars);
                    const markupType = ticketMarkupTypes[ticket.ticket_id] || globalMarkupType;
                    
                    let markupAmount = 0;
                    if (markupType === 'percentage') {
                      const percentage = parseFloat(ticketMarkupPercentages[ticket.ticket_id]) || 0;
                      markupAmount = basePriceUsd * (percentage / 100);
                    } else {
                      markupAmount = parseFloat(ticketMarkups[ticket.ticket_id]) || 0;
                    }
                    const finalPrice = basePriceUsd + markupAmount;
                    
                    return (
                      <div key={ticket.ticket_id} className={styles.ticketMarkupRow}>
                        <div className={styles.ticketInfo}>
                          <span className={styles.ticketNumber}>#{index + 1}</span>
                          <div className={styles.ticketDetails}>
                            <h4 className={styles.ticketTitle}>{ticket.ticket_title}</h4>
                            <p className={styles.ticketMeta}>
                              Original: {ticket.currency_code} {faceValueDollars.toFixed(2)} → Base: ${basePriceUsd.toFixed(2)} USD
                            </p>
                          </div>
                        </div>
                        
                        {/* Markup Type Selector */}
                        <div className={styles.ticketMarkupType}>
                          <label className={styles.smallLabel}>Type</label>
                          <select
                            className={styles.markupTypeSelect}
                            value={markupType}
                            onChange={(e) => handleTicketMarkupTypeChange(ticket.ticket_id, e.target.value as MarkupType)}
                          >
                            <option value="fixed">Fixed ($)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                        </div>
                        
                        {/* Markup Input - changes based on type */}
                        <div className={styles.ticketMarkupInput}>
                          <label className={styles.smallLabel}>
                            {markupType === 'percentage' ? 'Markup (%)' : 'Markup (USD)'}
                          </label>
                          <div className={styles.markupInputWrapper}>
                            <span className={styles.dollarPrefix}>
                              {markupType === 'percentage' ? '%' : '$'}
                            </span>
                            {markupType === 'percentage' ? (
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                step="0.1"
                                placeholder="0"
                                value={ticketMarkupPercentages[ticket.ticket_id] || ''}
                                onChange={(e) => handleTicketMarkupPercentageChange(ticket.ticket_id, e.target.value)}
                                className={styles.markupInputSmall}
                              />
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={getTicketMarkup(ticket.ticket_id)}
                                onChange={(e) => handleTicketMarkupChange(ticket.ticket_id, e.target.value)}
                                className={styles.markupInputSmall}
                              />
                            )}
                          </div>
                          {markupType === 'percentage' && markupAmount > 0 && (
                            <span className={styles.calculatedMarkup}>= ${markupAmount.toFixed(2)}</span>
                          )}
                        </div>
                        
                        <div className={styles.ticketFinalPrice}>
                          <label className={styles.smallLabel}>Final Price</label>
                          <span className={styles.finalPriceValue}>${finalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.actionButtons}>
                  <Button
                    variant="primary"
                    onClick={handleSaveMarkup}
                    disabled={saving || !hasAnyMarkup || tickets.length === 0}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save All Markups'}
                  </Button>

                  {existingMarkups.length > 0 && (
                    <Button
                      variant="danger"
                      onClick={handleDeleteMarkups}
                      disabled={saving}
                    >
                      <Trash2 size={16} />
                      Delete All Markups
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Price Summary */}
            {hasAnyMarkup && (
              <Card className={styles.previewCard}>
                <h2 className={styles.cardTitle}>
                  Step 5: Price Summary ({calculatedPrices.length} tickets)
                </h2>

                <div className={styles.priceTable}>
                  <div className={styles.priceTableHeader}>
                    <div>Ticket</div>
                    <div>Original Price</div>
                    <div>Base (USD)</div>
                    <div>Type</div>
                    <div>Markup</div>
                    <div>Final (USD)</div>
                  </div>

                  <div className={styles.priceTableBody}>
                    {calculatedPrices.map((price) => (
                      <div key={price.ticket_id} className={styles.priceRow}>
                        <div className={styles.ticketTitle}>{price.ticket_title}</div>
                        <div>{price.original_currency} {price.original_price.toFixed(2)}</div>
                        <div>${price.base_price_usd.toFixed(2)}</div>
                        <div className={styles.markupType}>
                          {price.markup_type === 'percentage' ? `${price.markup_percentage}%` : 'Fixed'}
                        </div>
                        <div className={styles.markup}>+${price.markup_price_usd.toFixed(2)}</div>
                        <div className={styles.finalPrice}>${price.final_price_usd.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Existing Markups */}
            {existingMarkups.length > 0 && (
              <Card className={styles.existingCard}>
                <h2 className={styles.cardTitle}>
                  Current Markup Pricing ({existingMarkups.length} tickets)
                </h2>

                <div className={styles.existingTable}>
                  <div className={styles.existingTableHeader}>
                    <div>Ticket ID</div>
                    <div>Base (USD)</div>
                    <div>Type</div>
                    <div>Markup</div>
                    <div>Final (USD)</div>
                    <div>Last Updated</div>
                    <div>Actions</div>
                  </div>

                  <div className={styles.existingTableBody}>
                    {existingMarkups.map((markup) => (
                      <div key={markup.id} className={styles.existingRow}>
                        <div className={styles.ticketId}>{markup.ticket_id}</div>
                        
                        {editingMarkupId === markup.id ? (
                          // Editing mode
                          <>
                            <div className={styles.editInputCell}>
                              <span className={styles.editPrefix}>$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingValues.base_price_usd}
                                onChange={(e) => handleEditValueChange('base_price_usd', e.target.value)}
                                className={styles.editInput}
                                disabled={saving}
                              />
                            </div>
                            <div className={styles.editInputCell}>
                              <select
                                className={styles.editSelect}
                                value={editingValues.markup_type}
                                onChange={(e) => handleEditValueChange('markup_type', e.target.value)}
                                disabled={saving}
                              >
                                <option value="fixed">Fixed ($)</option>
                                <option value="percentage">Percentage (%)</option>
                              </select>
                            </div>
                            <div className={styles.editInputCell}>
                              {editingValues.markup_type === 'percentage' ? (
                                <>
                                  <span className={styles.editPrefix}>%</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.1"
                                    value={editingValues.markup_percentage}
                                    onChange={(e) => handleEditValueChange('markup_percentage', e.target.value)}
                                    className={styles.editInput}
                                    disabled={saving}
                                  />
                                </>
                              ) : (
                                <>
                                  <span className={styles.editPrefix}>+$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingValues.markup_price_usd}
                                    onChange={(e) => handleEditValueChange('markup_price_usd', e.target.value)}
                                    className={styles.editInput}
                                    disabled={saving}
                                  />
                                </>
                              )}
                            </div>
                            <div className={styles.finalPrice}>
                              ${parseFloat(editingValues.final_price_usd || '0').toFixed(2)}
                            </div>
                            <div className={styles.timestamp}>
                              {new Date(markup.updated_at).toLocaleString()}
                            </div>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.actionBtn + ' ' + styles.saveBtn}
                                onClick={handleSaveEdit}
                                disabled={saving}
                                title="Save changes"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className={styles.actionBtn + ' ' + styles.cancelBtn}
                                onClick={handleCancelEdit}
                                disabled={saving}
                                title="Cancel editing"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          // View mode
                          <>
                            <div>${parseFloat(String(markup.base_price_usd)).toFixed(2)}</div>
                            <div className={styles.markupType}>
                              {markup.markup_type === 'percentage' 
                                ? `${markup.markup_percentage}%` 
                                : 'Fixed'}
                            </div>
                            <div className={styles.markup}>+${parseFloat(String(markup.markup_price_usd)).toFixed(2)}</div>
                            <div className={styles.finalPrice}>${parseFloat(String(markup.final_price_usd)).toFixed(2)}</div>
                            <div className={styles.timestamp}>
                              {new Date(markup.updated_at).toLocaleString()}
                            </div>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.actionBtn + ' ' + styles.editBtn}
                                onClick={() => handleStartEdit(markup)}
                                disabled={saving || editingMarkupId !== null}
                                title="Edit markup"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className={styles.actionBtn + ' ' + styles.deleteBtn}
                                onClick={() => handleDeleteSingleMarkup(markup.id)}
                                disabled={saving || deletingMarkupId === markup.id}
                                title="Delete markup"
                              >
                                {deletingMarkupId === markup.id ? (
                                  <RefreshCw size={16} className={styles.spinning} />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {!selectedEvent && (
          <Card className={styles.placeholderCard}>
            <div className={styles.placeholder}>
              <DollarSign size={64} className={styles.placeholderIcon} />
              <h3>No Event Selected</h3>
              <p>Select an event from the list above to configure markup pricing</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TicketMarkupManagement;
