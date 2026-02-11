import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin,
  Users, 
  Tv2, 
  Shield, 
  MapPinned, 
  IdCard,
  ChefHat,
  Building2
} from 'lucide-react';
import { useEventDetails } from '../hooks/useEventDetails';
import { useTickets } from '../hooks/useTickets';
import { useEventGuestRequirements } from '../hooks/useEventGuestRequirements';
import { useMultiCurrencyConversion } from '../hooks/useMultiCurrencyConversion';
import { useSelectedCurrency } from '../contexts/CurrencyContext';
import { useEventMarkups } from '../hooks/useTicketEnhancements';
import { usePublicEventHospitalities } from '../hooks/usePublicEventHospitalities';
import VenueMap from '../components/VenueMap';
import CartPanel from '../components/CartPanel';
import HospitalityManager from '../components/HospitalityManager';
import HospitalitySelector, { type SelectedHospitality } from '../components/HospitalitySelector';
import type { Ticket } from '../services/apiRoutes';
import styles from './EventTicketsPage.module.css';

// Extended CartItem with hospitality support
export interface CartItem {
  ticket: Ticket;
  quantity: number;
  selectedHospitalities?: SelectedHospitality[];
}

const EventTicketsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hoveredTicketCategory, setHoveredTicketCategory] = useState<string | null>(null);
  
  // Hospitality selector state
  const [showHospitalitySelector, setShowHospitalitySelector] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<Ticket | null>(null);
  
  // Fetch event details and tickets
  const { event, loading: eventLoading, error: eventError } = useEventDetails(eventId);
  const { tickets, loading: ticketsLoading, error: ticketsError } = useTickets({ event_id: eventId });
  
  // Get user-selected currency from global context
  const { selectedCurrencyCode } = useSelectedCurrency();
  
  // Get all unique currencies from tickets for multi-currency conversion
  // Always include 'USD' so we can convert fixed markup amounts and hospitality prices
  const ticketCurrencies = useMemo(() => {
    const codes = tickets.map(t => t.currency_code).filter(Boolean);
    if (!codes.includes('USD')) {
      codes.push('USD');
    }
    return codes;
  }, [tickets]);
  
  // Multi-currency conversion to the user-selected currency
  const { 
    convertAmount, 
    getExchangeRate,
    hasConversion: hasConversionForCurrency
  } = useMultiCurrencyConversion(ticketCurrencies, selectedCurrencyCode);
  
  // Fetch guest requirements for this event
  const { 
    requirements: guestRequirements, 
    loading: requirementsLoading, 
    error: requirementsError,
    fetchRequirements 
  } = useEventGuestRequirements();

  // Fetch markup pricing for this event
  const { 
    markupsByTicket
  } = useEventMarkups(eventId);

  // Fetch hospitality options for this event (PUBLIC API - no auth required)
  const {
    ticketHasHospitalities,
    getHospitalitiesForTicket
  } = usePublicEventHospitalities(eventId);

  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Fetch guest requirements when event loads (Phase 1: Step 2)
  useEffect(() => {
    if (eventId && event && !guestRequirements && !requirementsLoading) {
      fetchRequirements(eventId);
    }
  }, [eventId, event, guestRequirements, requirementsLoading, fetchRequirements]);

  // Filter tickets based on availability
  const filteredTickets = showAvailableOnly 
    ? tickets.filter(ticket => ticket.ticket_status === 'available' && ticket.stock > 0)
    : tickets;

  // Format event date for display based on single vs multi-day events
  const formatEventDate = (event: any) => {
    const startDate = new Date(event.date_start);
    const endDate = new Date(event.date_stop);

    // Check if it's a single day event (same date, different times)
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const startTime = startDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const endTime = endDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (startDateOnly.getTime() === endDateOnly.getTime()) {
      // Single day event - format as 'Tuesday, 30-Sep-2025, 14:00 - 16:00'
      const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const day = startDate.getDate();
      const month = startDate.toLocaleDateString('en-US', { month: 'short' });
      const year = startDate.getFullYear();
      return `${dayName}, ${day}-${month}-${year}, ${startTime} - ${endTime}`;
    } else {
      // Multi-day event - format as 'From Friday, 03-Oct-2025, 14:00 to Sunday, 05-Oct-2025, 16:00'
      const startDayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const endDayName = endDate.toLocaleDateString('en-US', { weekday: 'long' });
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      // Handle year difference if it's a multi-year event
      const startDateStr = `${startDay}-${startMonth}-${startYear}`;
      const endDateStr = endYear !== startYear ? `${endDay}-${endMonth}-${endYear}` : `${endDay}-${endMonth}-${endYear}`;

      return `From ${startDayName}, ${startDateStr}, ${startTime} to ${endDayName}, ${endDateStr}, ${endTime}`;
    }
  };

  // Check if this is a team sport (has both home and visiting teams)
  const isTeamSport = (event: any) => {
    return event.hometeam_name && event.visiting_name && event.hometeam_name !== event.visiting_name;
  };

  // Format price with correct currency and apply markup pricing if available
  // Uses live exchange rate for calculating percentage-based markup
  const formatPrice = (ticket: Ticket) => {
    const currency = ticket.currency_code || 'USD';
    const price = ticket.face_value || 0;
    
    // Check if this ticket has markup pricing
    const markup = markupsByTicket.get(ticket.ticket_id);
    
    // If currency conversion is available for THIS ticket's currency and currency is not already the selected currency
    if (hasConversionForCurrency(currency) && currency !== selectedCurrencyCode) {
      const convertedPrice = convertAmount(price, currency);
      
      // Calculate percentage markup on the converted price
      let markupAmount = 0;
      if (markup) {
        if (markup.markup_type === 'percentage' && markup.markup_percentage !== null) {
          markupAmount = convertedPrice * (markup.markup_percentage / 100);
        } else {
          // Fixed markup is stored in USD — convert to selected currency
          const fixedMarkupUsd = parseFloat(String(markup.markup_price_usd)) || 0;
          markupAmount = convertAmount(fixedMarkupUsd, 'USD');
        }
      }
      
      if (markupAmount > 0) {
        const finalPrice = convertedPrice + markupAmount;
        return `${selectedCurrencyCode} ${finalPrice.toFixed(2)}`;
      }
      
      return `${selectedCurrencyCode} ${convertedPrice.toFixed(2)}`;
    }
    
    // Already in the selected currency — calculate markup directly
    if (currency === selectedCurrencyCode) {
      if (markup) {
        let markupAmount = 0;
        if (markup.markup_type === 'percentage' && markup.markup_percentage !== null) {
          markupAmount = price * (markup.markup_percentage / 100);
        } else {
          // Fixed markup is in USD; if selected currency is also USD, use as-is, else convert
          const fixedMarkupUsd = parseFloat(String(markup.markup_price_usd)) || 0;
          markupAmount = selectedCurrencyCode === 'USD' ? fixedMarkupUsd : convertAmount(fixedMarkupUsd, 'USD');
        }
        if (markupAmount > 0) {
          const finalPrice = price + markupAmount;
          return `${selectedCurrencyCode} ${finalPrice.toFixed(2)}`;
        }
      }
    }
    
    return `${currency} ${price.toFixed(2)}`;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration API call
    alert('Thank you for your interest! We will contact you soon.');
    setFormData({ name: '', email: '' });
  };

  // Handle add ticket (updated for cart functionality with hospitality support)
  const handleAddTicket = (ticket: Ticket) => {
    console.log('[AddTicket] ticket_id:', ticket.ticket_id);
    console.log('[AddTicket] ticketHasHospitalities:', ticketHasHospitalities(ticket.ticket_id));
    console.log('[AddTicket] hospitalities for ticket:', getHospitalitiesForTicket(ticket.ticket_id));
    
    // Check if this ticket has hospitality options
    if (ticketHasHospitalities(ticket.ticket_id)) {
      // Show hospitality selector modal
      setPendingTicket(ticket);
      setShowHospitalitySelector(true);
      return;
    }
    
    // No hospitalities - add directly to cart
    addTicketToCart(ticket, []);
  };

  // Add ticket to cart with optional hospitalities
  const addTicketToCart = (ticket: Ticket, hospitalities: SelectedHospitality[]) => {
    const existingItem = cartItems.find(item => item.ticket.ticket_id === ticket.ticket_id);
    
    if (existingItem) {
      // Update quantity if item already exists (merge hospitalities)
      setCartItems(cartItems.map(item =>
        item.ticket.ticket_id === ticket.ticket_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item to cart with hospitalities
      setCartItems([...cartItems, { ticket, quantity: 1, selectedHospitalities: hospitalities }]);
    }
    
    // Open cart panel
    setIsCartOpen(true);
  };

  // Cart management functions
  const handleUpdateQuantity = (ticketId: string, quantity: number) => {
    setCartItems(cartItems.map(item =>
      item.ticket.ticket_id === ticketId
        ? { ...item, quantity }
        : item
    ));
  };

  const handleRemoveItem = (ticketId: string) => {
    setCartItems(cartItems.filter(item => item.ticket.ticket_id !== ticketId));
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
  };

  // Handle opening checkout flow
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      return; // Don't navigate if cart is empty
    }

    // Prepare event data for checkout page
    const eventData = {
      event_name: event?.event_name || '',
      tournament_name: event?.tournament_name || '',
      season: event?.season || '',
      date_start: event?.date_start || '',
      venue_name: event?.venue_name || '',
      city: event?.city || ''
    };

    // Calculate final prices for each cart item (with markup and currency conversion)
    // Converts to the user-selected currency using live exchange rates
    const cartItemsWithFinalPrices = cartItems.map(item => {
      const currency = item.ticket.currency_code || 'USD';
      const faceValue = item.ticket.face_value || 0;
      
      // Get markup for this ticket
      const markup = markupsByTicket.get(item.ticket.ticket_id);
      
      // Calculate price in the selected currency
      let basePrice = faceValue;
      if (hasConversionForCurrency(currency) && currency !== selectedCurrencyCode) {
        basePrice = convertAmount(faceValue, currency);
      }
      
      // Calculate markup in the selected currency
      let markupAmount = 0;
      if (markup) {
        if (markup.markup_type === 'percentage' && markup.markup_percentage !== null) {
          markupAmount = basePrice * (markup.markup_percentage / 100);
        } else {
          // Fixed markup is stored in USD — convert to selected currency
          const fixedMarkupUsd = parseFloat(String(markup.markup_price_usd)) || 0;
          markupAmount = selectedCurrencyCode === 'USD' ? fixedMarkupUsd : convertAmount(fixedMarkupUsd, 'USD');
        }
      }
      
      // Final price in selected currency = converted base + markup
      const finalPrice = basePrice + markupAmount;
      
      // Convert hospitality prices from USD to selected currency
      const convertedHospitalities = (item.selectedHospitalities || []).map(h => ({
        ...h,
        price_usd: selectedCurrencyCode === 'USD' ? h.price_usd : convertAmount(h.price_usd, 'USD')
      }));
      
      const hospitalityTotal = convertedHospitalities.reduce(
        (sum, h) => sum + h.price_usd, 0
      );
      
      return {
        ...item,
        selectedHospitalities: convertedHospitalities,
        finalPriceUSD: finalPrice, // Keep field name for backward compat with checkout pages
        markupAmount,
        hospitalityTotal,
        totalPricePerTicket: finalPrice + hospitalityTotal
      };
    });

    // Convert markupsByTicket Map to plain object for serialization
    const markupsObject: Record<string, any> = {};
    markupsByTicket.forEach((value, key) => {
      markupsObject[key] = value;
    });

    setIsCartOpen(false);
    
    // Navigate directly to login page to start authentication-first checkout flow
    navigate('/checkout/login', {
      state: {
        cartItems: cartItemsWithFinalPrices,
        eventData,
        guestRequirements: guestRequirements || null,
        markupsData: markupsObject,
        selectedCurrencyCode
      }
    });
  };

  // Handle hospitality selection confirmation
  const handleHospitalityConfirm = (selectedHospitalities: SelectedHospitality[]) => {
    if (pendingTicket) {
      addTicketToCart(pendingTicket, selectedHospitalities);
      setShowHospitalitySelector(false);
      setPendingTicket(null);
      setIsCartOpen(true);
    }
  };

  // Handle hospitality selection cancel
  const handleHospitalityCancel = () => {
    setShowHospitalitySelector(false);
    setPendingTicket(null);
  };

  if (eventLoading || ticketsLoading) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.pageGrid}>
            {/* Left Column */}
            <div className={styles.leftColumn}>
              {/* Event Details Skeleton */}
              <div className={styles.eventDetails}>
                <div className={styles.skeletonEventTitle}></div>
                
                <div className={styles.skeletonEventInfo}>
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoText}></div>
                  </div>
                  
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoText}></div>
                  </div>
                  
                  <div className={styles.skeletonInfoItem}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonInfoTextLong}></div>
                  </div>
                </div>

                <div className={styles.skeletonEventMeta}>
                  <div className={styles.skeletonTournament}></div>
                  <div className={styles.skeletonTeamVs}>
                    <div className={styles.skeletonTeamName}></div>
                    <div className={styles.skeletonVs}></div>
                    <div className={styles.skeletonTeamName}></div>
                  </div>
                </div>
              </div>

              {/* Tickets Skeleton */}
              <div className={styles.ticketsSection}>
              <div className={styles.ticketsHeader}>
                <div className={styles.skeletonTicketsTitle}></div>
                <div className={styles.skeletonCheckbox}>
                  <div className={styles.skeletonCheckboxInput}></div>
                  <div className={styles.skeletonCheckboxLabel}></div>
                </div>
              </div>

              <div className={styles.ticketsList}>
                {[...Array(3)].map((_, index) => (
                  <div key={index} className={styles.skeletonTicketCard}>
                    <div className={styles.skeletonTicketInfo}>
                      <div className={styles.skeletonTicketHeader}>
                        <div className={styles.skeletonTicketTitle}></div>
                        <div className={styles.skeletonCategoryType}></div>
                      </div>
                      
                      <div className={styles.skeletonTicketDetails}>
                        <div className={styles.skeletonTicketMeta}>
                          <div className={styles.skeletonCategoryName}></div>
                          <div className={styles.skeletonTicketStatus}></div>
                        </div>
                        
                        <div className={styles.skeletonStockInfo}></div>
                      </div>
                    </div>

                    <div className={styles.skeletonTicketPrice}>
                      <div className={styles.skeletonPriceAmount}></div>
                      <div className={styles.skeletonAddButton}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Right Column */}
            <div className={styles.rightColumn}>
              {/* Venue Map Skeleton */}
              <div className={styles.venueImages}>
                <div className={styles.skeletonVenueMapContainer}>
                  <div className={styles.skeletonMapControls}>
                    <div className={styles.skeletonMapTitle}></div>
                    <div className={styles.skeletonMapSubtitle}></div>
                  </div>
                  
                  <div className={styles.skeletonSvgContainer}>
                    <div className={styles.skeletonVenueMapPlaceholder}>
                      <div className={styles.skeletonVenueIcon}></div>
                    </div>
                  </div>
                  
                  <div className={styles.skeletonCategoryLegend}>
                    <div className={styles.skeletonLegendTitle}></div>
                    <div className={styles.skeletonCategoryList}>
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className={styles.skeletonCategoryItem}>
                          <div className={styles.skeletonCategoryColor}></div>
                          <div className={styles.skeletonCategoryName}></div>
                          <div className={styles.skeletonCategoryPrice}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Form Skeleton */}
              <div className={styles.registrationSection}>
              <div className={styles.registrationCard}>
                <div className={styles.skeletonRegistrationTitle}></div>
                <div className={styles.skeletonRegistrationText}></div>
                
                <div className={styles.skeletonRegistrationForm}>
                  <div className={styles.skeletonFormInput}></div>
                  <div className={styles.skeletonFormInput}></div>
                  <div className={styles.skeletonSubmitButton}></div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventError || ticketsError) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>Error loading event: {eventError || ticketsError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.eventTicketsPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p>Event not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.eventTicketsPage}>
      <div className={styles.container}>
        <div className={styles.pageGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Event Details */}
            <div className={styles.eventDetails}>
              <h1 className={styles.eventTitle}>{event.event_name}</h1>
              
              <div className={styles.eventInfo}>
                <div className={styles.infoItem}>
                  <Calendar className={styles.infoIcon} size={20} />
                  <span>{formatEventDate(event)}</span>
                </div>
                
                <div className={styles.infoItem}>
                  <MapPin className={styles.infoIcon} size={20} />
                  <span>{event.venue_name}, {event.city}, {event.iso_country}</span>
                </div>

                <div className={styles.tournament}>
                  <strong>{event.tournament_name}</strong> - {event.season}
                </div>

              </div>
            </div>

            {/* Tickets Section */}
            <div className={styles.ticketsSection}>
            <div className={styles.ticketsHeader}>
              <div className={styles.ticketsTitle}>
                <h2>Available Tickets</h2>
                <p className={styles.ticketsSubtitle}>
                  <MapPin size={14} />
                  Hover over tickets to see their location on the venue map
                </p>
              </div>
              <div className={styles.ticketFilters}>
                {/* Hospitality Management Button */}
                {eventId && tickets.length > 0 && (
                  <HospitalityManager eventId={eventId} tickets={tickets} />
                )}
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  />
                  <span>Show available tickets</span>
                </label>
              </div>
            </div>

            <div className={styles.ticketsList}>
              {filteredTickets.length === 0 ? (
                <div className={styles.emptyTickets}>
                  <p>No tickets available</p>
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <div 
                    key={ticket.ticket_id} 
                    className={styles.ticketCard}
                    onMouseEnter={() => setHoveredTicketCategory(ticket.category_id)}
                    onMouseLeave={() => setHoveredTicketCategory(null)}
                  >
                    <div className={styles.ticketInfo}>
                      <div className={styles.ticketHeader}>
                        <div className={styles.titleRow}>
                          <h3 className={styles.ticketTitle}>
                            {ticket.ticket_title}
                          </h3>
                        </div>
                        
                        {/* Seat Options & Features */}
                        <div className={styles.seatFeatures}>
                          {ticket.options?.pairs_only && (
                            <div className={styles.featureIcon} data-tooltip="Tickets must be sold in pairs">
                              <Users size={16} />
                            </div>
                          )}
                          {ticket.options?.videowall && (
                            <div className={styles.featureIcon} data-tooltip="This place offers you a large video wall to follow all the action">
                              <Tv2 size={16} />
                            </div>
                          )}
                          {ticket.options?.covered_seat && (
                            <div className={styles.featureIcon} data-tooltip="This ticket offers you covered area">
                              <Shield size={16} />
                            </div>
                          )}
                          {ticket.options?.numbered_seat && (
                            <div className={styles.featureIcon} data-tooltip="This ticket offers you numbered seating">
                              <MapPinned size={16} />
                            </div>
                          )}
                          {ticket.options?.customer_details_required && (
                            <div className={styles.featureIcon} data-tooltip="Customer information is required">
                              <IdCard size={16} />
                            </div>
                          )}
                          {ticket.category_type === 'grandstand' && (
                            <div className={styles.featureIcon} data-tooltip="This place offers you a seat on a grandstand">
                              <Building2 size={16} />
                            </div>
                          )}
                          {(ticket.category_type === 'hospitality' || ticketHasHospitalities(ticket.ticket_id)) && (
                            <div className={`${styles.featureIcon} ${styles.hospitalityIcon}`} data-tooltip="Hospitality options available">
                              <ChefHat size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.ticketPrice}>
                      <div className={styles.priceDisplay}>
                        <span 
                          className={styles.priceAmount}
                          data-tooltip={`Local Price: ${ticket.currency_code} ${ticket.face_value?.toFixed(2)}\nExchange Rate: 1 ${ticket.currency_code} = ${hasConversionForCurrency(ticket.currency_code || '') ? getExchangeRate(ticket.currency_code || '').toFixed(4) : 'N/A'} ${selectedCurrencyCode}\nConverted: ${hasConversionForCurrency(ticket.currency_code || '') ? `${selectedCurrencyCode} ${convertAmount(ticket.face_value || 0, ticket.currency_code || '').toFixed(2)}` : 'N/A'}\nMarkup: ${markupsByTicket.get(ticket.ticket_id) ? parseFloat(String(markupsByTicket.get(ticket.ticket_id)?.markup_price_usd)).toFixed(2) : '0.00'} (USD)\nFinal Price: ${formatPrice(ticket)}`}
                        >
                          {formatPrice(ticket)}
                        </span>
                      </div>
                      
                      {ticket.ticket_status === 'available' && ticket.stock > 0 ? (
                        <button 
                          className={styles.addTicketButton}
                          onClick={() => handleAddTicket(ticket)}
                        >
                          Add Ticket
                        </button>
                      ) : (
                        <button 
                          className={styles.addTicketButton}
                          disabled
                        >
                          {ticket.ticket_status === 'disabled' ? 'Not Available' : 'Sold Out'}
                        </button>
                      )}
                      
                      <div className={styles.ticketMeta}>
                        <span className={styles.ticketStatus} data-status={ticket.ticket_status}>
                          {ticket.ticket_status.charAt(0).toUpperCase() + ticket.ticket_status.slice(1)}
                        </span>
                        {ticket.stock > 0 && (
                          <span className={styles.stockInfo}>
                            {ticket.stock}+ Tickets Left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Venue Map */}
            <div className={styles.venueImages}>
              {eventId && (
                <VenueMap 
                  venueId={event.venue_id} 
                  eventId={eventId} 
                  className={styles.venueMapContainer}
                  externalHoveredCategory={hoveredTicketCategory}
                />
              )}
            </div>

            {/* Registration Form */}
            <div className={styles.registrationSection}>
              <div className={styles.registrationCard}>
                <h2>Can't find the ticket you are looking for?</h2>
                <p>Please register your interest below to get updates to future {isTeamSport(event) ? `${event.hometeam_name} matches` : `${event.event_name} events`}.</p>
                
                <form onSubmit={handleSubmit} className={styles.registrationForm}>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={styles.formInput}
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitButton}>
                    REGISTER YOUR INTEREST
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        eventData={event ? {
          event_name: event.event_name,
          tournament_name: event.tournament_name,
          season: event.season,
          date_start: event.date_start,
          venue_name: event.venue_name,
          city: event.city
        } : undefined}
        guestRequirements={guestRequirements}
        guestRequirementsLoading={requirementsLoading}
        guestRequirementsError={requirementsError}
        currencyConversion={{
          hasConversion: true,
          convertAmount,
          getExchangeRate,
          hasConversionForCurrency,
          targetCurrencyCode: selectedCurrencyCode
        }}
        markupsByTicket={markupsByTicket}
      />

      {/* Hospitality Selector Modal */}
      {showHospitalitySelector && pendingTicket && (
        <HospitalitySelector
          ticketTitle={pendingTicket.ticket_title}
          hospitalities={getHospitalitiesForTicket(pendingTicket.ticket_id)}
          onConfirm={handleHospitalityConfirm}
          onCancel={handleHospitalityCancel}
        />
      )}
    </div>
  );
};

export default EventTicketsPage;
