/**
 * Custom hooks for ticket enhancements (markup pricing & hospitality)
 */

import { useState, useEffect } from 'react';
import {
  getEventMarkups,
  getTicketMarkup,
  getActiveHospitalities,
  getEventHospitalities,
  getTicketHospitalities,
  type TicketMarkup,
  type HospitalityService,
  type TicketHospitality,
  type EventHospitalitiesResponse,
} from '../services/ticketEnhancementsService';

// ============================================================================
// useEventMarkups - Get markup pricing for an event
// ============================================================================

export interface UseEventMarkupsResult {
  markups: TicketMarkup[];
  markupsByTicket: Map<string, TicketMarkup>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useEventMarkups = (eventId: string | undefined): UseEventMarkupsResult => {
  const [markups, setMarkups] = useState<TicketMarkup[]>([]);
  const [markupsByTicket, setMarkupsByTicket] = useState<Map<string, TicketMarkup>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkups = async () => {
    if (!eventId) {
      setMarkups([]);
      setMarkupsByTicket(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getEventMarkups(eventId);
      setMarkups(data);

      // Create lookup map for easy access by ticket_id
      const map = new Map<string, TicketMarkup>();
      data.forEach(markup => {
        map.set(markup.ticket_id, markup);
      });
      setMarkupsByTicket(map);
    } catch (err: any) {
      console.error('Failed to fetch event markups:', err);
      setError(err.message || 'Failed to load markup pricing');
      setMarkups([]);
      setMarkupsByTicket(new Map());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkups();
  }, [eventId]);

  return {
    markups,
    markupsByTicket,
    loading,
    error,
    refetch: fetchMarkups,
  };
};

// ============================================================================
// useTicketMarkup - Get markup pricing for a specific ticket
// ============================================================================

export interface UseTicketMarkupResult {
  markup: TicketMarkup | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTicketMarkup = (ticketId: string | undefined): UseTicketMarkupResult => {
  const [markup, setMarkup] = useState<TicketMarkup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkup = async () => {
    if (!ticketId) {
      setMarkup(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTicketMarkup(ticketId);
      setMarkup(data);
    } catch (err: any) {
      console.error('Failed to fetch ticket markup:', err);
      setError(err.message || 'Failed to load markup pricing');
      setMarkup(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkup();
  }, [ticketId]);

  return {
    markup,
    loading,
    error,
    refetch: fetchMarkup,
  };
};

// ============================================================================
// useActiveHospitalities - Get all active hospitality services
// ============================================================================

export interface UseActiveHospitalitiesResult {
  hospitalities: HospitalityService[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useActiveHospitalities = (): UseActiveHospitalitiesResult => {
  const [hospitalities, setHospitalities] = useState<HospitalityService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitalities = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getActiveHospitalities();
      setHospitalities(data);
    } catch (err: any) {
      console.error('Failed to fetch hospitalities:', err);
      setError(err.message || 'Failed to load hospitality services');
      setHospitalities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalities();
  }, []);

  return {
    hospitalities,
    loading,
    error,
    refetch: fetchHospitalities,
  };
};

// ============================================================================
// useEventHospitalities - Get hospitality services for an event
// ============================================================================

export interface UseEventHospitalitiesResult {
  eventHospitalities: EventHospitalitiesResponse;
  hospitalitiesByTicket: Map<string, TicketHospitality[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useEventHospitalities = (
  eventId: string | undefined
): UseEventHospitalitiesResult => {
  const [eventHospitalities, setEventHospitalities] = useState<EventHospitalitiesResponse>({
    event_id: '',
    hospitalities: [],
    grouped_by_ticket: {},
  });
  const [hospitalitiesByTicket, setHospitalitiesByTicket] = useState<Map<string, TicketHospitality[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventHospitalities = async () => {
    if (!eventId) {
      setEventHospitalities({
        event_id: '',
        hospitalities: [],
        grouped_by_ticket: {},
      });
      setHospitalitiesByTicket(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getEventHospitalities(eventId);
      setEventHospitalities(data);

      // Create lookup map for easy access by ticket_id
      const map = new Map<string, TicketHospitality[]>();
      Object.entries(data.grouped_by_ticket).forEach(([ticketId, hospitalities]) => {
        map.set(ticketId, hospitalities);
      });
      setHospitalitiesByTicket(map);
    } catch (err: any) {
      console.error('Failed to fetch event hospitalities:', err);
      setError(err.message || 'Failed to load hospitality services');
      setEventHospitalities({
        event_id: eventId,
        hospitalities: [],
        grouped_by_ticket: {},
      });
      setHospitalitiesByTicket(new Map());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventHospitalities();
  }, [eventId]);

  return {
    eventHospitalities,
    hospitalitiesByTicket,
    loading,
    error,
    refetch: fetchEventHospitalities,
  };
};

// ============================================================================
// useTicketHospitalities - Get hospitality services for a specific ticket
// ============================================================================

export interface UseTicketHospitalitiesResult {
  ticketHospitalities: TicketHospitality[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTicketHospitalities = (
  eventId: string | undefined,
  ticketId: string | undefined
): UseTicketHospitalitiesResult => {
  const [ticketHospitalities, setTicketHospitalities] = useState<TicketHospitality[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketHospitalities = async () => {
    if (!eventId || !ticketId) {
      setTicketHospitalities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTicketHospitalities(eventId, ticketId);
      setTicketHospitalities(data);
    } catch (err: any) {
      console.error('Failed to fetch ticket hospitalities:', err);
      setError(err.message || 'Failed to load hospitality services');
      setTicketHospitalities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketHospitalities();
  }, [eventId, ticketId]);

  return {
    ticketHospitalities,
    loading,
    error,
    refetch: fetchTicketHospitalities,
  };
};
