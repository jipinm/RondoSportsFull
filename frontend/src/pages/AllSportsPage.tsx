import React from 'react';
import { Link } from 'react-router-dom';
import { useSports } from '../hooks/useSports';
import styles from './AllSportsPage.module.css';
import { FaFutbol, FaBasketballBall, FaTableTennis, FaVolleyballBall } from 'react-icons/fa';
import { MdSports, MdArrowForward } from 'react-icons/md';

const AllSportsPage: React.FC = () => {
  const { sports, loading, error } = useSports();

  const getSportIcon = (sportId: string) => {
    switch (sportId.toLowerCase()) {
      case 'soccer':
      case 'football':
        return <FaFutbol />;
      case 'basketball':
        return <FaBasketballBall />;
      case 'tennis':
        return <FaTableTennis />;
      case 'volleyball':
        return <FaVolleyballBall />;
      default:
        return <MdSports />;
    }
  };

  return (
    <div className={styles.sportsPage}>
      <div className={styles.container}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <MdSports className={styles.titleIcon} />
            All Sports
          </h1>
          <p className={styles.pageDescription}>
            Explore tournaments and events across all sports
          </p>
        </div>

        {/* Content */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading sports...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>Error loading sports: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className={styles.retryButton}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && sports.length === 0 && (
          <div className={styles.emptyState}>
            <MdSports className={styles.emptyIcon} />
            <h3>No sports available</h3>
            <p>Please check back later for available sports.</p>
          </div>
        )}

        {!loading && !error && sports.length > 0 && (
          <>
            <div className={styles.resultsHeader}>
              <span className={styles.resultsCount}>
                {sports.length} sport{sports.length !== 1 ? 's' : ''} available
              </span>
            </div>

            <div className={styles.sportsGrid}>
              {sports.map((sport) => (
                <Link
                  key={sport.sport_id}
                  to={`/sports/${sport.sport_id}/tournaments`}
                  className={styles.sportCard}
                >
                  <div className={styles.sportIcon}>
                    {getSportIcon(sport.sport_id)}
                  </div>
                  <div className={styles.sportInfo}>
                    <h3 className={styles.sportName}>{sport.name}</h3>
                    <div className={styles.sportFooter}>
                      <span className={styles.viewTournaments}>
                        View Tournaments
                        <MdArrowForward className={styles.arrowIcon} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllSportsPage;
