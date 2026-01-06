import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchBar.module.css';
import { FaRegCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { tournamentsService } from '../../services/tournamentsService';
import type { Tournament } from '../../types/tournaments';
import Toast from '../common/Toast';
import type { ToastType } from '../common/Toast';

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Tournament typeahead state
  const [tournamentQuery, setTournamentQuery] = useState('');
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]); // All tournaments preloaded
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]); // Filtered results
  const [showTournamentDropdown, setShowTournamentDropdown] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const tournamentDropdownRef = useRef<HTMLDivElement>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Helper function to show toast
  const showToast = (message: string, type: ToastType = 'warning') => {
    setToast({ message, type });
  };

  // Preload all tournaments on component mount
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        console.log('🔍 SearchBar: Loading tournaments for season 25/26');
        const tournaments = await tournamentsService.getAllTournaments('25/26');
        console.log('✅ SearchBar: Tournaments loaded successfully:', {
          count: tournaments.length,
          tournaments: tournaments
        });
        setAllTournaments(tournaments);
      } catch (error) {
        console.error('❌ Failed to preload tournaments:', error);
      }
    };

    loadTournaments();
  }, []);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (tournamentDropdownRef.current && !tournamentDropdownRef.current.contains(event.target as Node)) {
        setShowTournamentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Format selected date for display
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Format date in local timezone for comparison
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        isDisabled: date < today,
        isSelected: searchDate === dateStr
      });
    }
    
    return days;
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    // Format date in local timezone to avoid timezone shift issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    setSearchDate(isoDate);
    setShowDatePicker(false);
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Check if we can navigate to previous month
  const canNavigateToPrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const lastDayOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    return lastDayOfPrevMonth >= today;
  };

  // Filter tournaments client-side (no API call)
  const filterTournaments = (query: string) => {
    if (query.length < 2) {
      setFilteredTournaments([]);
      setShowTournamentDropdown(false);
      return;
    }

    // Filter preloaded tournaments by query
    const results = allTournaments.filter(tournament => 
      tournament.official_name.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredTournaments(results);
    setShowTournamentDropdown(results.length > 0);
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setTournamentQuery(tournament.official_name);
    setSearchQuery('');
    setShowTournamentDropdown(false);
  };

  /**
   * Handle search form submission
   * Navigates to events page with keyword and/or date parameters
   * Example URLs:
   * - /events?keyword=English%20Premier%20League
   * - /events?date=2025-10-10
   * - /events?keyword=Champions%20League&date=2025-10-10
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if tournament is selected for tournament-specific search
    if (selectedTournament) {
      handleTournamentSearch(e);
      return;
    }
    
    // Check if user has typed in tournament field but hasn't selected a tournament
    // This prevents partial text like "pre" from being treated as a keyword search
    if (tournamentQuery && !selectedTournament) {
      showToast('Please select a tournament from the dropdown list.', 'warning');
      return;
    }
    
    // Get the current search query (could be tournament query or regular search query)
    const currentQuery = tournamentQuery || searchQuery;
    
    // Validate that at least one search criterion is provided
    if (!currentQuery.trim() && !searchDate.trim()) {
      showToast('Please enter an event keyword or select a date to search.', 'warning');
      return;
    }
    
    // Build search parameters
    const searchParams = new URLSearchParams();
    
    // Add keyword search parameter if provided
    if (currentQuery.trim()) {
      searchParams.append('keyword', currentQuery.trim());
    }
    
    // Add date search parameter if provided
    if (searchDate.trim()) {
      // Convert date format if needed (assuming dd/mm/yyyy input format)
      const formattedDate = formatDateForSearch(searchDate.trim());
      if (formattedDate) {
        searchParams.append('date', formattedDate);
      }
    }
    
    // Navigate to events page with search parameters
    const queryString = searchParams.toString();
    const eventsUrl = queryString ? `/events?${queryString}` : '/events';
    navigate(eventsUrl);
  };

  /**
   * Handle tournament search form submission
   * Navigates to events page with tournament-specific parameters and triggers API call
   */
  const handleTournamentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that tournament is selected from typeahead (not just typed text)
    if (!selectedTournament) {
      showToast('Please select a tournament from the dropdown list.', 'warning');
      return;
    }

    // Validate that date is selected
    if (!searchDate.trim()) {
      showToast('Please select a date to search for events.', 'warning');
      return;
    }
    
    // Build search parameters for tournament search
    const searchParams = new URLSearchParams();
    searchParams.append('sport_type', selectedTournament.sport_type);
    searchParams.append('tournament_id', selectedTournament.tournament_id);
    
    // Add date parameter
    const formattedDate = formatDateForSearch(searchDate.trim());
    if (formattedDate) {
      searchParams.append('date', formattedDate);
    }
    
    // Navigate to events page with tournament parameters
    const queryString = searchParams.toString();
    const eventsUrl = `/events?${queryString}`;
    
    // The events page will handle the API call to:
    // /v1/events?sport_type={sport_type}&tournament_id={tournament_id}&event_status=notstarted&date_start={YYYY-MM-DD}&date_stop={YYYY-MM-DD}
    // where date_start and date_stop are both set to the selected date
    
    navigate(eventsUrl);
  };

  // Helper function to format date for search
  const formatDateForSearch = (dateInput: string): string | null => {
    // For HTML date input, the value is already in YYYY-MM-DD format
    if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    
    // Fallback: Handle dd/mm/yyyy format if somehow still used
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateInput.match(dateRegex);
    
    if (match) {
      const [, day, month, year] = match;
      // Return in ISO format (YYYY-MM-DD) for consistency
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Try to parse other common date formats
    try {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
      }
    } catch (error) {
      console.warn('Invalid date format:', dateInput);
    }
    
    return null;
  };

  return (
    <div className={styles.searchBarContainer}>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className={styles.wrapper}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <div className={styles.searchTitle}>
            <span className={styles.buyText}>Buy</span>
            <span className={styles.ticketsText}>Tickets</span>
          </div>
          
          <div className={styles.searchFields}>
            <div className={styles.searchField}>
              <div className={styles.tournamentInputWrapper} ref={tournamentDropdownRef}>
                <input
                  type="text"
                  id="event-search"
                  className={styles.searchInput}
                  placeholder="Search tournaments (e.g., Premier League, Champions League)"
                  value={selectedTournament ? selectedTournament.official_name : (tournamentQuery || searchQuery)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (selectedTournament) {
                      // Clear tournament selection when user starts typing again
                      setSelectedTournament(null);
                      setTournamentQuery(value);
                      setSearchQuery('');
                      filterTournaments(value);
                    } else {
                      // Handle both tournament and regular search
                      setTournamentQuery(value);
                      setSearchQuery(value);
                      filterTournaments(value);
                    }
                  }}
                  onFocus={() => {
                    const query = selectedTournament ? selectedTournament.official_name : (tournamentQuery || searchQuery);
                    if (query && query.length >= 2) {
                      setShowTournamentDropdown(filteredTournaments.length > 0);
                    }
                  }}
                />
                
                {showTournamentDropdown && filteredTournaments.length > 0 && !selectedTournament && (
                  <div className={styles.tournamentDropdown}>
                    {filteredTournaments.slice(0, 8).map((tournament: Tournament) => (
                      <div
                        key={tournament.tournament_id}
                        className={styles.tournamentDropdownItem}
                        onClick={() => handleTournamentSelect(tournament)}
                      >
                        <div className={styles.tournamentName}>{tournament.official_name}</div>
                        <div className={styles.tournamentSport}>{tournament.sport_type}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.searchField}>
              <div className={styles.dateInputWrapper} ref={datePickerRef}>
                <input
                  type="text"
                  id="date-search"
                  className={styles.searchInput}
                  placeholder="Select date"
                  value={formatDisplayDate(searchDate)}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  readOnly
                />
                <div 
                  className={styles.calendarIconWrapper}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <FaRegCalendarAlt className={styles.calendarIcon} />
                </div>
                
                {showDatePicker && (
                  <div className={styles.datePickerContainer}>
                    <div className={styles.datePickerHeader}>
                      <button
                        type="button"
                        onClick={() => navigateMonth('prev')}
                        disabled={!canNavigateToPrevMonth()}
                        className={styles.navButton}
                      >
                        <FaChevronLeft />
                      </button>
                      <span className={styles.monthYear}>
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateMonth('next')}
                        className={styles.navButton}
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                    
                    <div className={styles.weekDays}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={styles.weekDay}>{day}</div>
                      ))}
                    </div>
                    
                    <div className={styles.calendarGrid}>
                      {generateCalendarDays().map((dayInfo, index) => (
                        <div
                          key={index}
                          className={`${styles.calendarDay} ${
                            dayInfo ? (
                              dayInfo.isDisabled ? styles.disabled :
                              dayInfo.isSelected ? styles.selected : styles.available
                            ) : styles.empty
                          }`}
                          onClick={() => dayInfo && !dayInfo.isDisabled && handleDateSelect(dayInfo.date)}
                        >
                          {dayInfo?.day}
                        </div>
                      ))}
                    </div>
                    
                    {searchDate && (
                      <div className={styles.datePickerFooter}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchDate('');
                            setShowDatePicker(false);
                          }}
                          className={styles.clearButton}
                        >
                          Clear Date
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <button type="submit" className={styles.searchButton}>
              Search Events
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;
