import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './UpcomingEvents.module.css';
import { ArrowRight } from 'lucide-react';
import { bannersService } from '../../services/bannersService';
import type { Banner } from '../../types/banners';
import { formatEventDate } from '../../utils/dateUtils';

const UpcomingEvents: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const itemsPerPage = 9; // Show 9 events at a time (3x3 grid)
  const totalPages = Math.ceil(banners.length / itemsPerPage);

  // Fetch banners on mount
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const data = await bannersService.getBannersByLocation('homepage_secondary', 10);
        setBanners(data);
      } catch (err: any) {
        console.error('Failed to fetch upcoming events banners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Handle window resize for responsive images
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (banners.length <= itemsPerPage) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000); // Change page every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length, totalPages]);

  // Handle pagination dot click
  const handleDotClick = (index: number) => {
    setCurrentPage(index);
  };

  // Get current page events
  const startIndex = currentPage * itemsPerPage;
  const currentEvents = banners.slice(startIndex, startIndex + itemsPerPage);

  // Loading state
  if (loading) {
    return (
      <section className={styles.upcomingEvents}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
            <p className={styles.sectionDescription}>
              Explore top upcoming matches across sports.
              From football to motorsports – grab your seat before it's gone!
            </p>
          </div>
          
          <div className={styles.eventsGrid}>
            {[...Array(9)].map((_, index) => (
              <div key={index} className={styles.eventCard}>
                <div className={styles.skeletonImage}></div>
                <div className={styles.eventContent}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonPrice}></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.footer}>
            <div className={styles.footerLeft}></div>
            <div className={styles.pagination}>
              <div className={styles.skeletonDot}></div>
              <div className={styles.skeletonDot}></div>
              <div className={styles.skeletonDot}></div>
            </div>
            <div className={styles.skeletonViewAll}></div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state - show fallback
  if (banners.length === 0) {
    return (
      <section className={styles.upcomingEvents}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
            <p className={styles.sectionDescription}>
              Explore top upcoming matches across sports.
              From football to motorsports – grab your seat before it's gone!
            </p>
          </div>
          <div className={styles.emptyState}>
            <p>No upcoming events at this time. Check back soon!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.upcomingEvents}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Upcoming Events</h2>
          <p className={styles.sectionDescription}>
            Explore top upcoming matches across sports.
            From football to motorsports – grab your seat before it's gone!
          </p>
        </div>
        
        <div className={styles.eventsGrid}>
          {currentEvents.map((banner) => {
            const imageUrl = isMobile && banner.mobile_image_url 
              ? banner.mobile_image_url 
              : banner.image_url;
            const formattedDate = formatEventDate(banner.event_date);

            return (
              <div key={banner.id} className={styles.eventCard}>
                <img 
                  src={imageUrl} 
                  alt={banner.title} 
                  className={styles.eventImage} 
                />
                <div className={styles.eventContent}>
                  <h3 className={styles.eventTitle}>{banner.title}</h3>
                  {formattedDate && (
                    <div className={styles.eventDate}>
                      {formattedDate}
                    </div>
                  )}
                  <div className={styles.priceRow}>
                    {banner.price_tag && (
                      <div className={styles.priceTag}>{banner.price_tag}</div>
                    )}
                    {!banner.price_tag && <div></div>}
                    {banner.link_url && banner.link_target && (
                      <a 
                        href={banner.link_url} 
                        className={styles.actionButton}
                        target={banner.link_target}
                        rel={banner.link_target === '_blank' ? 'noopener noreferrer' : undefined}
                        aria-label={`View ${banner.title}`}
                      >
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </a>
                    )}
                  </div>
                  {banner.description && (
                    <div className={styles.eventInfo}>
                      {banner.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className={styles.footer}>
          <div className={styles.footerLeft}></div>
          
          {totalPages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: totalPages }).map((_, index) => (
                <div
                  key={index}
                  className={`${styles.paginationDot} ${index === currentPage ? styles.paginationDotActive : ''}`}
                  onClick={() => handleDotClick(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Go to page ${index + 1}`}
                ></div>
              ))}
            </div>
          )}
          
          <Link to="/events" className={styles.viewAllLink}>
            <ArrowRight size={40} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UpcomingEvents;
