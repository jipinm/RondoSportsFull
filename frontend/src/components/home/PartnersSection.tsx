import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiRoutes';
import styles from './PartnersSection.module.css';

interface FeaturedTeam {
  sport_type: string;
  tournament_id: string;
  team_id: string;
  team_name: string;
  logo_url: string;
}

const PartnersSection: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredLogo, setHoveredLogo] = useState<number | null>(null);
  const [partners, setPartners] = useState<FeaturedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const fetchFeaturedTeams = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<{ success: boolean; data: FeaturedTeam[] }>(
          '/v1/team-credentials/featured'
        );
        
        if (response.data.success && response.data.data) {
          setPartners(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching featured teams:', err);
        setError('Failed to load featured teams');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedTeams();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-slide on mobile
  useEffect(() => {
    if (!isMobile || partners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % partners.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [isMobile, partners.length]);

  const handleTeamClick = (team: FeaturedTeam) => {
    const params = new URLSearchParams({
      sport_type: team.sport_type,
      tournament_id: team.tournament_id,
      team_id: team.team_id
    });
    navigate(`/events?${params.toString()}`);
  };

  // Get base URL from environment
  const baseUrl = import.meta.env.VITE_XS2EVENT_BASE_URL;

  if (loading) {
    return (
      <section className={styles.partnersSection}>
        <div className={styles.container}>
          <div className={styles.partnersContent}>
            <h3 className={styles.partnersTitle}>RONDO SPORTS IS PROUD TO WORK WITH</h3>
            <div className={styles.partnersLogos}>
              <p>Loading featured teams...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || partners.length === 0) {
    return null; // Don't show section if there's an error or no teams
  }

  return (
    <section className={styles.partnersSection}>
      <div className={styles.container}>
        <div className={styles.partnersContent}>
          <h3 className={styles.partnersTitle}>RONDO SPORTS IS PROUD TO WORK WITH</h3>
          <div className={styles.partnersLogos}>
            {isMobile ? (
              // Mobile: Show one logo at a time with slider
              <>
                <div 
                  className={styles.logoWrapper}
                  onClick={() => handleTeamClick(partners[currentSlide])}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src={`${baseUrl}${partners[currentSlide].logo_url}`} 
                    alt={partners[currentSlide].team_name} 
                    className={styles.partnerLogo} 
                  />
                </div>
                {partners.length > 1 && (
                  <div className={styles.sliderDots}>
                    {partners.map((_, index) => (
                      <button
                        key={index}
                        className={`${styles.sliderDot} ${index === currentSlide ? styles.sliderDotActive : ''}`}
                        onClick={() => setCurrentSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Desktop: Show all logos
              partners.map((partner, index) => (
                <div 
                  key={`${partner.team_id}-${index}`}
                  className={styles.logoWrapper}
                  onMouseEnter={() => setHoveredLogo(index)}
                  onMouseLeave={() => setHoveredLogo(null)}
                  onClick={() => handleTeamClick(partner)}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src={`${baseUrl}${partner.logo_url}`} 
                    alt={partner.team_name} 
                    className={`${styles.partnerLogo} ${hoveredLogo === index ? styles.logoHovered : ''}`} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
