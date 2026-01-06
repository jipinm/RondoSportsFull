import React from 'react';
import { useParams } from 'react-router-dom';
import { useTournaments } from '../hooks/useTournaments';
import { useSports } from '../hooks/useSports';
import styles from './TournamentsPage.module.css';

const TournamentsPage: React.FC = () => {
  const { sport } = useParams<{ sport: string }>();
  const { tournaments, loading, error } = useTournaments(sport);
  const { sports } = useSports();

  // Get sport display name
  const selectedSport = sports.find(s => s.sport_id === sport);
  const sportDisplayName = selectedSport?.name || sport?.toUpperCase() || 'UNKNOWN SPORT';

  return (
    <div className={styles.tournamentsPage}>
      <div className={styles.container}>
        <h1>Tournaments for {sportDisplayName}</h1>
        {loading && <p>Loading tournaments...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && !error && (
          <div>
            <p>{tournaments.length} tournaments found</p>
            {tournaments.map(tournament => (
              <div key={tournament.tournament_id} style={{ margin: '10px 0', padding: '10px', border: '1px solid #333' }}>
                <h3>{tournament.official_name}</h3>
                {tournament.region && <p>Region: {tournament.region}</p>}
                {tournament.number_events && <p>Events: {tournament.number_events}</p>}
                {tournament.tournament_type && <p>Type: {tournament.tournament_type}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentsPage;