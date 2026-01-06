import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { useTeamDetails } from '../hooks/useTeamDetails';
import { useTeamCredentials } from '../hooks/useTeamCredentials';
import type { Event } from '../services/apiRoutes';
import styles from './EventsPage.module.css';

const EventsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract URL parameters
  const sport_type = searchParams.get('sport_type') || undefined;
  const tournament_id = searchParams.get('tournament_id') || undefined;
  const team_id = searchParams.get('team_id') || undefined;
  const date = searchParams.get('date') || undefined;

  // Log the extracted parameters and potential API endpoint
  React.useEffect(() => {
    console.log('🔍 EventsPage: URL Parameters extracted:', {
      sport_type,
      tournament_id,
      team_id,
      date,
      fullUrl: window.location.href,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    console.log('📡 EventsPage: Will fetch events with params:', {
      sport_type,
      tournament_id,
      team_id,
      date,
      willConvertTo: date ? { date_start: date, date_stop: date } : 'no date filtering'
    });
  }, [sport_type, tournament_id, team_id, date]);

  // Filter states
  const [locationFilter, setLocationFilter] = useState('Location');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [priceFilter, setPriceFilter] = useState('Price');

  // Fetch data
  const { events, loading: eventsLoading, error: eventsError } = useEvents({
    sport_type,
    tournament_id,
    team_id,
    date
  });

  // Log when events are loaded
  React.useEffect(() => {
    if (!eventsLoading && events) {
      console.log('✅ EventsPage: Events loaded and ready to display:', {
        totalEvents: events.length,
        hasError: !!eventsError,
        events: events.slice(0, 3).map(e => ({
          id: e.event_id,
          name: e.event_name,
          tournament: e.tournament_name,
          date: e.date_start
        }))
      });
    }
  }, [events, eventsLoading, eventsError]);

  const { team, loading: teamLoading, error: teamError } = useTeamDetails(team_id);
  
  // Fetch team credentials for enhanced team description
  const { teamCredentials, loading: credentialsLoading, error: credentialsError, notFound: credentialsNotFound } = useTeamCredentials(
    tournament_id, 
    team_id
  );

  // Console log the team credentials API usage for debugging
  React.useEffect(() => {
    
    // Debug the error condition logic
  }, [tournament_id, team_id, teamCredentials, credentialsLoading, credentialsError, credentialsNotFound, team, eventsError, teamError]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    };
  };

  // Format event date for display based on single vs multi-day events
  const formatEventDate = (event: Event) => {
    const startDate = new Date(event.date_start);
    const endDate = new Date(event.date_stop);

    // Check if it's a single day event (same date, different times)
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (startDateOnly.getTime() === endDateOnly.getTime()) {
      // Single day event - format as 'Tuesday, 30-Sep-2025'
      const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      const day = startDate.getDate();
      const month = startDate.toLocaleDateString('en-US', { month: 'short' });
      const year = startDate.getFullYear();
      return `${dayName}, ${day}-${month}-${year}`;
    } else {
      // Multi-day event - format as 'From Friday, 03-Oct-2025 to Sunday, 05-Oct-2025'
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

      return `From ${startDayName}, ${startDateStr} to ${endDayName}, ${endDateStr}`;
    }
  };

  // Format price with correct currency from API response
  const formatPrice = (event: Event) => {
    if (!event.min_ticket_price_eur || event.min_ticket_price_eur === 0) {
      return 'N/A';
    }
    
    // The field name suggests EUR, but we should use the actual currency from API
    // For now, using EUR as indicated by the field name min_ticket_price_eur
    // TODO: Update Event interface if API provides currency_code field
    const currency = 'EUR';
    const price = event.min_ticket_price_eur;
    
    return `${currency} ${price.toFixed(2)}`;
  };

  // Handle ticket navigation
  const handleViewTickets = (event: Event) => {
    navigate(`/events/${event.event_id}/tickets`);
  };

  // Filter and sort events
  const getFilteredAndSortedEvents = () => {
    let filteredEvents = [...events];

    // Location filter
    if (locationFilter === 'Home' && team) {
      filteredEvents = filteredEvents.filter(event => 
        event.hometeam_id === team.team_id
      );
    } else if (locationFilter === 'Away' && team) {
      filteredEvents = filteredEvents.filter(event => 
        event.visiting_id === team.team_id
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'Today') {
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date_start);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay.getTime() === today.getTime();
      });
    } else if (dateFilter === 'This Week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date_start);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay >= weekStart && eventDay <= weekEnd;
      });
    } else if (dateFilter === 'This Month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date_start);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay >= monthStart && eventDay <= monthEnd;
      });
    }

    // Price sorting
    if (priceFilter === 'Low to High') {
      filteredEvents.sort((a, b) => {
        const priceA = a.min_ticket_price_eur || 0;
        const priceB = b.min_ticket_price_eur || 0;
        return priceA - priceB;
      });
    } else if (priceFilter === 'High to Low') {
      filteredEvents.sort((a, b) => {
        const priceA = a.min_ticket_price_eur || 0;
        const priceB = b.min_ticket_price_eur || 0;
        return priceB - priceA;
      });
    }

    return filteredEvents;
  };

  // Filter dropdown component
  const FilterDropdown: React.FC<{
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }> = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className={`${styles.filterDropdown} ${isOpen ? styles.open : ''}`}>
        <button
          className={styles.filterButton}
          onClick={() => setIsOpen(!isOpen)}
        >
          {value}
          <span className={styles.filterIcon}>▼</span>
        </button>
        {isOpen && (
          <div className={styles.filterDropdownMenu}>
            {options.map(option => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (eventsLoading || teamLoading || (team_id && tournament_id && credentialsLoading && !credentialsNotFound)) {
    return (
      <div className={styles.eventsPage}>
        <div className={styles.container}>
          <div className={styles.mainContent}>
            <div className={styles.contentHeader}>
              <div className={styles.headerLeft}>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonSubtitle}></div>
              </div>
              <div className={styles.headerRight}>
                <div className={styles.skeletonFilters}>
                  <div className={styles.skeletonFilter}></div>
                  <div className={styles.skeletonFilter}></div>
                  <div className={styles.skeletonFilter}></div>
                </div>
              </div>
            </div>
            
            <div className={styles.eventsList}>
              {[...Array(3)].map((_, index) => (
                <div key={index} className={styles.skeletonEventCard}>
                  <div className={styles.skeletonEventContent}>
                    <div className={styles.skeletonDateColumn}>
                      <div className={styles.skeletonDateMonth}></div>
                      <div className={styles.skeletonDateDay}></div>
                      <div className={styles.skeletonDateDayName}></div>
                    </div>
                    
                    <div className={styles.skeletonEventInfo}>
                      <div className={styles.skeletonEventTitle}></div>
                      <div className={styles.skeletonEventDetails}>
                        <div className={styles.skeletonEventDetail}></div>
                        <div className={styles.skeletonEventDetail}></div>
                        <div className={styles.skeletonEventDetail}></div>
                      </div>
                    </div>
                    
                    <div className={styles.skeletonPriceColumn}>
                      <div className={styles.skeletonPriceLabel}></div>
                      <div className={styles.skeletonPriceAmount}></div>
                      <div className={styles.skeletonButton}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.teamSidebar}>
            <div className={styles.skeletonTeamCard}>
              <div className={styles.skeletonTeamHeader}>
                <div className={styles.skeletonTeamLogo}></div>
                <div className={styles.skeletonTeamInfo}>
                  <div className={styles.skeletonTeamName}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventsError || teamError || (credentialsError && !credentialsNotFound)) {
    return (
      <div className={styles.eventsPage}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <span className={styles.errorText}>
              Error loading data: {eventsError || teamError || (credentialsError && !credentialsNotFound && credentialsError)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.eventsPage}>
      {/* Team Banner at the top of entire page - full width - only if credentials exist */}
      {team_id && teamCredentials && !credentialsNotFound && teamCredentials.banner_url && (
        <div className={styles.eventsBanner}>
          <img 
            src={`${import.meta.env.VITE_XS2EVENT_BASE_URL}${teamCredentials.banner_url}`}
            alt={`${team?.official_name || teamCredentials.team_name} banner`}
            className={styles.eventsBannerImage}
            onError={(e) => {
              // Hide the banner if it fails to load
              const bannerContainer = (e.target as HTMLImageElement).parentElement;
              if (bannerContainer) {
                bannerContainer.style.display = 'none';
              }
            }}
            onLoad={() => {
            }}
          />
          {/* Team name overlay on banner */}
          <div className={styles.eventsBannerOverlay}>
            <h1 className={styles.eventsBannerTitle}>
              {team?.official_name || teamCredentials.team_name}
            </h1>
          </div>
        </div>
      )}
      
      <div className={`${styles.container} ${!team_id || !team ? styles.fullWidth : ''}`}>
        {/* Main Content - Now on the left */}
        <div className={styles.mainContent}>
          <div className={styles.contentHeader}>
            <div className={styles.headerLeft}>
              <h1>Events</h1>
              <p className={styles.eventsCount}>Found {getFilteredAndSortedEvents().length} events</p>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.filtersHeader}>
                {team_id && (
                  <FilterDropdown
                    value={locationFilter}
                    options={['Location', 'All Locations', 'Home', 'Away']}
                    onChange={setLocationFilter}
                  />
                )}
                <FilterDropdown
                  value={dateFilter}
                  options={['All Dates', 'Today', 'This Week', 'This Month']}
                  onChange={setDateFilter}
                />
                <FilterDropdown
                  value={priceFilter}
                  options={['Price', 'Low to High', 'High to Low']}
                  onChange={setPriceFilter}
                />
              </div>
            </div>
          </div>

          {getFilteredAndSortedEvents().length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎫</div>
              <div className={styles.emptyContent}>
                <h3 className={styles.emptyTitle}>No events found</h3>
                <p className={styles.emptyDescription}>
                  {events.length === 0 
                    ? "We couldn't find any events for your selected criteria. Try adjusting your filters or check back later for new events."
                    : "No events match your current filters. Try adjusting your location, date, or price filters to see more events."
                  }
                </p>
                <div className={styles.emptyActions}>
                  {events.length > 0 && (
                    <button 
                      className={styles.clearFiltersButton}
                      onClick={() => {
                        setLocationFilter('Location');
                        setDateFilter('All Dates');
                        setPriceFilter('Price');
                      }}
                    >
                      Clear All Filters
                    </button>
                  )}
                  <button 
                    className={styles.browseAllButton}
                    onClick={() => navigate('/events')}
                  >
                    Browse All Events
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.eventsList}>
              {getFilteredAndSortedEvents().map(event => {
                const eventDate = formatDate(event.date_start);
                const formattedEventDate = formatEventDate(event);

                return (
                  <div key={event.event_id} className={styles.eventCard}>
                    <div className={styles.eventContent}>
                      {/* Date Column */}
                      <div className={styles.dateColumn}>
                        <div className={styles.dateMonth}>{eventDate.month}</div>
                        <div className={styles.dateDay}>{eventDate.day}</div>
                        <div className={styles.dateDayName}>{eventDate.dayName}</div>
                      </div>

                      {/* Event Info */}
                      <div className={styles.eventInfo}>
                        {sport_type === 'soccer' && event.is_popular && (
                          <div className={styles.popularBadge}>
                            <Flame size={12} className={styles.flameIcon} />
                            Popular
                          </div>
                        )}

                        <h2 className={styles.eventTitle}>
                          {event.event_name}
                        </h2>

                        <div className={styles.eventDetails}>
                          <div className={styles.eventDetail}>
                            {new Date(event.date_start).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })} | {event.venue_name}, {event.city}, {event.iso_country}{(sport_type === 'rugby' || sport_type === 'tennis') ? ` | ${event.tournament_name || ''} - ${event.season || ''}` : ''}
                          </div>
                          <div className={styles.eventDateDisplay}>
                            {formattedEventDate}
                          </div>
                        </div>
                      </div>

                      {/* Price Column */}
                      <div className={styles.priceColumn}>
                        <div className={styles.priceLabel}>FROM {formatPrice(event)}</div>
                        <button
                          className={styles.viewTicketsButton}
                          onClick={() => handleViewTickets(event)}
                        >
                          View Tickets
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Sidebar - Now on the right */}
        <div className={styles.teamSidebar}>
          {team_id && team && (
            <div className={styles.teamCard}>
              <div className={styles.teamHeader}>
                <div className={styles.teamLogoPlaceholder}>
                  {(() => {
                    // Use team credentials logo if available, otherwise fallback to constructed URL
                    const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL;
                    let logoUrl = null;
                    
                    if (teamCredentials && !credentialsNotFound && teamCredentials.logo_url) {
                      // Use logo from team credentials API
                      logoUrl = `${baseUrl}${teamCredentials.logo_url}`;
                    } else if (tournament_id) {
                      // Fallback to constructed logo URL
                      logoUrl = `${baseUrl}/images/team/logo/${tournament_id}_${team.team_id}_logo.png`;
                    }

                    return logoUrl ? (
                      <img 
                        src={logoUrl}
                        alt={`${team.official_name} logo`}
                        className={styles.teamLogoImage}
                        onError={(e) => {
                          // Hide the image and show fallback text if it fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.textContent = team.team_slug || team.official_name.substring(0, 2);
                          }
                        }}
                        onLoad={(e) => {
                          // Ensure the image is visible when it loads successfully
                          (e.target as HTMLImageElement).style.display = 'block';
                        }}
                      />
                    ) : (
                      team.team_slug || team.official_name.substring(0, 2)
                    );
                  })()}
                </div>
                <div className={styles.teamInfo}>
                  <h2>{team.official_name}</h2>
                </div>
              </div>
            </div>
          )}

          {/* Filters removed - now in main content header */}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
