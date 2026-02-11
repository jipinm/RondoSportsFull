import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import { FaGlobe, FaSearch, FaUser } from 'react-icons/fa';
import { MdArrowDropDown } from 'react-icons/md';
import { useSports } from '../../hooks/useSports';
import { useMenuHierarchy } from '../../hooks/useMenuHierarchy';
import { useAuth } from '../../services/customerAuth';
import { useSelectedCurrency } from '../../contexts/CurrencyContext';

// Sport display name mapping
const sportDisplayNames: Record<string, string> = {
  soccer: 'FOOTBALL',
  formula1: 'FORMULA ONE',
  rugby: 'RUGBY',
  tennis: 'TENNIS',
  cricket: 'CRICKET',
  motorsport: 'MOTORSPORT',
  basketball: 'BASKETBALL',
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  darts: 'DARTS',
  horseracing: 'HORSE RACING',
  boxing: 'BOXING',
  motogp: 'MOTOGP',
  combatsport: 'COMBAT SPORT',
  icehockey: 'ICE HOCKEY',
  dtm: 'DTM',
  superbike: 'SUPERBIKE',
  padel: 'PADEL',
};

// Fixed navigation sports (must remain in exact positions)
const FIXED_SPORTS = ['soccer', 'formula1', 'rugby', 'tennis', 'cricket'];

// Helper functions to generate event links with proper parameters
// Note: Removed season parameter - using date_start filtering in API instead
const getEventLinkBySport = (sportType: string): string => {
  return `/events?sport_type=${sportType}`;
};

const getTeamsPageLink = (tournamentId: string): string => {
  const link = `/teams?tournament_id=${tournamentId}&sport_type=soccer&page=1&page_size=50`;
  return link;
};

const Header: React.FC = () => {
  const { sports, loading, error } = useSports();
  const { 
    tournaments: footballTournaments, 
    loading: tournamentsLoading, 
    error: tournamentsError
  } = useMenuHierarchy();
  const { isAuthenticated, logout } = useAuth();
  const { currencies, selectedCurrency, loading: currenciesLoading, setSelectedCurrency } = useSelectedCurrency();
  const [logoLoaded, setLogoLoaded] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [accountDropdownOpen, setAccountDropdownOpen] = React.useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  const navigationRef = React.useRef<HTMLElement>(null);

  // Log sports data changes for debugging
  React.useEffect(() => {
    // Sports data updated
  }, [sports, loading, error]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure navigation starts from the beginning on mobile
  React.useEffect(() => {
    if (isMobile && navigationRef.current) {
      // Reset scroll position immediately
      navigationRef.current.scrollLeft = 0;
      
      // Also reset after a short delay to ensure it takes effect
      const timeoutId = setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.scrollLeft = 0;
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMobile]);

  // Debug: Monitor account dropdown state
  React.useEffect(() => {
    console.log('Account dropdown state changed:', { 
      isMobile, 
      accountDropdownOpen 
    });
  }, [accountDropdownOpen, isMobile]);

  // Toggle submenu on mobile
  const handleMenuClick = (e: React.MouseEvent, menuId: string, hasSubmenu: boolean = false) => {
    if (isMobile && hasSubmenu) {
      // If submenu is not active, prevent navigation and show submenu
      if (activeSubmenu !== menuId) {
        e.preventDefault();
        e.stopPropagation();
        setActiveSubmenu(menuId);
      } else {
        // If submenu is already active and user clicks again, close it and allow navigation
        setActiveSubmenu(null);
      }
    }
  };

  // Close submenu when clicking on a submenu item
  const handleSubmenuItemClick = () => {
    if (isMobile) {
      setActiveSubmenu(null);
    }
  };

  // Toggle account dropdown
  const toggleAccountDropdown = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation();
      const newState = !accountDropdownOpen;
      console.log('Toggling account dropdown:', newState);
      setAccountDropdownOpen(newState);
    }
  };

  // Close account dropdown when clicking on a dropdown item
  const handleAccountItemClick = () => {
    if (isMobile) {
      setAccountDropdownOpen(false);
    }
  };

  // Close submenu and account dropdown when clicking outside (mobile only)
  React.useEffect(() => {
    if (!isMobile || (!activeSubmenu && !accountDropdownOpen && !currencyDropdownOpen)) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the submenu or account dropdown
      if (target.closest(`.${styles.submenu}`) || 
          target.closest(`.${styles.navItemWithSubmenu}`) ||
          target.closest(`.${styles.topBarItemWithSubmenu}`) ||
          target.closest(`.${styles.currencySubmenu}`)) {
        return;
      }
      setActiveSubmenu(null);
      setAccountDropdownOpen(false);
      setCurrencyDropdownOpen(false);
    };

    // Use timeout to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, activeSubmenu, accountDropdownOpen, currencyDropdownOpen]);

  // Get display name for sport, fallback to sport_id if not mapped
  const getDisplayName = (sportId: string): string => {
    return sportDisplayNames[sportId] || sportId.toUpperCase();
  };

  // Filter sports for "OTHER SPORTS" dropdown (exclude fixed sports)
  const otherSports = sports.filter(sport => !FIXED_SPORTS.includes(sport.sport_id));

  // Log filtered sports for debugging
  React.useEffect(() => {
    if (sports.length > 0) {
      // Sports filtering results processed
    }
  }, [sports, otherSports]);

  // Create navigation items for fixed sports
  const renderFixedSportItem = (sportId: string) => {
    const sport = sports.find(s => s.sport_id === sportId);
    const displayName = getDisplayName(sportId);

    // Special handling for soccer (football) with tournaments submenu
    if (sportId === 'soccer') {
      return (
        <div 
          className={styles.navItemWithSubmenu} 
          key={sportId}
          onMouseEnter={() => {
            if (!isMobile) {
              // Football menu hover - tournaments already loaded
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              // Optional: Clear tournaments cache when leaving menu
              // clearTournaments();
            }
          }}
        >
          <Link 
            to={getEventLinkBySport(sportId)} 
            className={styles.navItem} 
            data-sport-id={sportId}
            onClick={(e) => handleMenuClick(e, 'soccer', true)}
          >
            {displayName}
            {isMobile && <MdArrowDropDown style={{ marginLeft: '4px', fontSize: '16px' }} />}
          </Link>
          <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'soccer' ? styles.submenuActive : ''}`}>
            {tournamentsLoading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`tournament-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                    <div className={styles.skeletonTournamentName}></div>
                    <div className={styles.skeletonArrow}></div>
                  </div>
                ))}
              </>
            )}
            {tournamentsError && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                Error loading tournaments
              </div>
            )}
            {!tournamentsLoading && !tournamentsError && footballTournaments.length === 0 && (
              <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                No tournaments available
              </div>
            )}
            {!tournamentsLoading && !tournamentsError && footballTournaments.map((tournament) => {
              return (
                <Link 
                  key={tournament.tournament_id}
                  to={getTeamsPageLink(tournament.tournament_id)}
                  className={styles.submenuItem}
                  onClick={handleSubmenuItemClick}
                >
                  {tournament.official_name}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Regular sport items without submenu - now with proper links
    return (
      <Link 
        to={getEventLinkBySport(sportId)}
        className={styles.navItem}
        key={sportId}
        data-sport-id={sportId}
        style={{ opacity: sport ? 1 : 0.7 }} // Dim if sport not available
      >
        {displayName}
      </Link>
    );
  };

  return (
    <header>
      <div className={styles.topBar}>
        <div className={styles.wrapper}>
          <div className={styles.topBarLeft}>
            <div className={styles.topBarItem}>
              <FaGlobe className={styles.icon} />
              <span>London</span>
              <MdArrowDropDown className={styles.icon} />
            </div>
            <div className={styles.topBarItemWithSubmenu}>
              <div 
                className={styles.topBarItem}
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                <span className={styles.currencySymbol}>
                  {currenciesLoading ? '...' : (selectedCurrency?.symbol || '$')}
                </span>
                <span>{selectedCurrency?.code || 'USD'}</span>
                <MdArrowDropDown className={styles.icon} />
              </div>
              <div className={`${styles.currencySubmenu} ${currencyDropdownOpen ? styles.currencySubmenuActive : ''}`}>
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    className={`${styles.currencySubmenuItem} ${selectedCurrency?.code === currency.code ? styles.currencySelected : ''}`}
                    onClick={() => {
                      setSelectedCurrency(currency);
                      setCurrencyDropdownOpen(false);
                    }}
                  >
                    <span className={styles.currencyItemSymbol}>{currency.symbol}</span>
                    <span className={styles.currencyItemCode}>{currency.code}</span>
                    <span className={styles.currencyItemName}>{currency.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Link to="/" className={styles.logo}>
              {!logoError ? (
                <img 
                  src="/logo.png" 
                  alt="RONDO Sports Tickets" 
                  className={styles.logoImg}
                  onLoad={() => {
                    setLogoLoaded(true);
                  }}
                  onError={() => {
                    setLogoError(true);
                  }}
                  style={{
                    display: logoLoaded ? 'block' : 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}
                />
              ) : (
                <div style={{ 
                  color: '#ffffff', 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  letterSpacing: '2px'
                }}>
                  RONDO
                </div>
              )}
          </Link>
          <div className={styles.topBarRight}>
            <div className={styles.topBarItemWithSubmenu}>
              <div 
                className={styles.topBarItem}
                onClick={toggleAccountDropdown}
                style={{ cursor: 'pointer' }}
              >
                <FaUser className={styles.icon} />
                <span>My Account</span>
                <MdArrowDropDown className={styles.icon} />
              </div>
              <div 
                className={`${styles.accountSubmenu} ${isMobile && accountDropdownOpen ? styles.accountSubmenuActive : ''}`}
              >
                {!isAuthenticated ? (
                  <Link 
                    to="/login" 
                    className={styles.accountSubmenuItem}
                    onClick={handleAccountItemClick}
                  >
                    Login
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/profile" 
                      className={styles.accountSubmenuItem}
                      onClick={handleAccountItemClick}
                    >
                      Profile
                    </Link>
                    <Link 
                      to="/bookings" 
                      className={styles.accountSubmenuItem}
                      onClick={handleAccountItemClick}
                    >
                      Bookings
                    </Link>
                    <button 
                      onClick={() => {
                        handleAccountItemClick();
                        logout();
                      }} 
                      className={styles.accountSubmenuItem}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'inherit', 
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className={styles.topBarItem}>
              <FaSearch className={styles.icon} />
            </div>
          </div>
        </div>
      </div>
      <nav className={styles.navigation} ref={navigationRef}>
        <div className={styles.wrapper}>
          <div className={styles.navItems}>
            {/* Fixed sports in exact same positions */}
            {renderFixedSportItem('soccer')}
            {renderFixedSportItem('formula1')}
            {renderFixedSportItem('rugby')}
            {renderFixedSportItem('tennis')}
            {renderFixedSportItem('cricket')}
            
            {/* OTHER SPORTS dropdown with dynamic content */}
            <div 
              className={styles.navItemWithSubmenu}
            >
              <span 
                className={styles.navItem} 
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  if (isMobile) {
                    if (activeSubmenu !== 'other-sports') {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveSubmenu('other-sports');
                    } else {
                      setActiveSubmenu(null);
                    }
                  }
                }}
              >
                OTHER SPORTS <MdArrowDropDown />
              </span>
              <div className={`${styles.submenu} ${isMobile && activeSubmenu === 'other-sports' ? styles.submenuActive : ''}`}>
                {loading && (
                  <>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`other-sports-skeleton-${index}`} className={styles.submenuItemSkeleton}>
                        <div className={styles.skeletonSportName}></div>
                      </div>
                    ))}
                  </>
                )}
                {error && (
                  <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#ff6b6b' }}>
                    Error loading sports
                  </div>
                )}
                {!loading && !error && otherSports.length === 0 && (
                  <div className={styles.submenuItem} style={{ fontStyle: 'italic', color: '#666' }}>
                    No other sports available
                  </div>
                )}
                {!loading && !error && [...otherSports]
                  .sort((a, b) => getDisplayName(a.sport_id).localeCompare(getDisplayName(b.sport_id)))
                  .map((sport) => (
                  <Link 
                    to={getEventLinkBySport(sport.sport_id)}
                    className={styles.submenuItem}
                    key={sport.sport_id}
                    data-sport-id={sport.sport_id}
                    onClick={handleSubmenuItemClick}
                  >
                    {getDisplayName(sport.sport_id)}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* RONDO PLATINUM - keep as is */}
            <a href="#" className={styles.navItemHighlighted}>
              <img src="/images/icons/star.png" alt="Star" className={styles.starIcon} />
              <span>RONDO PLATINUM</span>
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
