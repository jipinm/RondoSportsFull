import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAllTeams } from '../hooks/useAllTeams';
import { ArrowLeft, Users, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './TeamsPage.module.css';

const TeamsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract URL parameters
  const tournament_id = searchParams.get('tournament_id') || undefined;
  const sport_type = searchParams.get('sport_type') || 'soccer';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '50');

  // Fetch teams data - NO CACHING
  const { teams, loading, error, pagination } = useAllTeams({
    tournament_id,
    sport_type,
    page_size: pageSize,
    page: currentPage
  });

  // Debug: Log API request details for TeamsPage only
  React.useEffect(() => {
    const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL;
    const debugUrl = new URL('/v1/teams', baseUrl);
    debugUrl.searchParams.set('sport_type', sport_type);
    debugUrl.searchParams.set('popular', 'false');
    debugUrl.searchParams.set('page_size', '100');
    debugUrl.searchParams.set('page', '1');
    if (tournament_id) {
      debugUrl.searchParams.set('tournament_id', tournament_id);
    }
  }, [tournament_id, sport_type]);

  // Debug: Log teams response data
  React.useEffect(() => {
    if (teams.length > 0) {
    }
    if (loading) {
    }
    if (error) {
    }
  }, [teams, pagination, loading, error]);

  // Create event link for team
  const getTeamEventsLink = (teamId: string): string => {
    const params = new URLSearchParams({
      sport_type,
      team_id: teamId
    });
    if (tournament_id) {
      params.set('tournament_id', tournament_id);
    }
    return `/events?${params.toString()}`;
  };

  // Scroll to top when page changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    newParams.set('page_size', pageSize.toString());
    setSearchParams(newParams);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < Math.ceil(pagination.total_size / pagination.page_size)) {
      handlePageChange(currentPage + 1);
    }
  };

  return (
    <div className={styles.teamsPage}>
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <div className={styles.contentHeader}>
            <div className={styles.headerLeft}>
              <Link to={`/events?sport_type=${sport_type}&tournament_id=${tournament_id}&page=1&page_size=${pageSize}`} className={styles.backButton}>
                <ArrowLeft size={20} />
                Back to Events
              </Link>
              <h1>All Teams</h1>
              <p className={styles.teamsCount}>
                {teams.length > 0 ? `${pagination?.total_size || teams.length} teams` : 'Loading...'}
              </p>
            </div>
          </div>

          {/* Skeleton Loading State - Show on any loading, not just initial */}
          {loading && (
            <div className={styles.teamsGrid}>
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className={styles.teamCardSkeleton}>
                  <div className={styles.skeletonTeamInfo}>
                    <div className={styles.skeletonTeamLogo}></div>
                    <div className={styles.skeletonTeamName}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && teams.length === 0 && (
            <div className={styles.errorState}>
              <Globe className={styles.errorIcon} />
              <h3>Unable to Load Teams</h3>
              <p>{error}</p>
              <button 
                className={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && teams.length === 0 && (
            <div className={styles.emptyState}>
              <Users className={styles.emptyIcon} />
              <h3>No Teams Found</h3>
              <p>No teams are available for this tournament at the moment.</p>
            </div>
          )}

          {/* Teams Grid - Hide during loading to show skeleton instead */}
          {teams.length > 0 && !loading && (
            <>
              <div className={styles.teamsGrid}>
                {teams.map((team) => {
                  try {
                    // Construct logo URL based on tournament_id and team_id
                    const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL;
                    const logoUrl = tournament_id 
                      ? `${baseUrl}/images/team/logo/${tournament_id}_${team.team_id}_logo.png`
                      : null;

                    return (
                      <Link
                        key={team.team_id}
                        to={getTeamEventsLink(team.team_id)}
                        className={styles.teamCard}
                        data-testid={`team-card-${team.team_id}`}
                      >
                        <div className={styles.teamInfo}>
                          {logoUrl && (
                            <div className={styles.teamLogo}>
                              <img 
                                src={logoUrl}
                                alt={`${team.official_name} logo`}
                                className={styles.logoImage}
                                onError={(e) => {
                                  // Hide the image if it fails to load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                onLoad={(e) => {
                                  // Ensure the image is visible when it loads successfully
                                  (e.target as HTMLImageElement).style.display = 'block';
                                }}
                              />
                            </div>
                          )}
                          <h3 className={styles.teamName}>{team.official_name}</h3>
                          
                          
                        </div>
                      </Link>
                    );
                  } catch (error) {
                    return null;
                  }
                })}
              </div>

              {/* Results Summary */}
              <div className={styles.resultsSummary}>
                Showing {teams.length} of {pagination?.total_size || teams.length} teams
              </div>

              {/* Pagination */}
              {pagination && pagination.total_size > pagination.page_size && (
                <div className={styles.pagination}>
                  <button
                    className={`${styles.paginationButton} ${currentPage <= 1 ? styles.paginationButtonDisabled : ''}`}
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  <div className={styles.paginationNumbers}>
                    {Array.from({ length: Math.ceil(pagination.total_size / pagination.page_size) }, (_, i) => i + 1)
                      .filter(pageNum => {
                        const totalPages = Math.ceil(pagination.total_size / pagination.page_size);
                        if (totalPages <= 7) return true;
                        if (pageNum <= 3) return true;
                        if (pageNum >= totalPages - 2) return true;
                        if (Math.abs(pageNum - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((_, index, filteredPages) => {
                        const actualPage = filteredPages[index];
                        const isCurrentPage = actualPage === currentPage;

                        // Add ellipsis if there's a gap
                        if (index > 0 && actualPage - filteredPages[index - 1] > 1) {
                          return [
                            <span key={`ellipsis-${actualPage}`} className={styles.paginationEllipsis}>...</span>,
                            <button
                              key={actualPage}
                              className={`${styles.paginationButton} ${isCurrentPage ? styles.paginationButtonActive : ''}`}
                              onClick={() => handlePageChange(actualPage)}
                            >
                              {actualPage}
                            </button>
                          ];
                        }

                        return (
                          <button
                            key={actualPage}
                            className={`${styles.paginationButton} ${isCurrentPage ? styles.paginationButtonActive : ''}`}
                            onClick={() => handlePageChange(actualPage)}
                          >
                            {actualPage}
                          </button>
                        );
                      })
                      .flat()
                    }
                  </div>

                  <button
                    className={`${styles.paginationButton} ${!pagination.has_next ? styles.paginationButtonDisabled : ''}`}
                    onClick={handleNextPage}
                    disabled={!pagination.has_next}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;
