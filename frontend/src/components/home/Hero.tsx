import React, { useState, useEffect } from 'react';
import styles from './Hero.module.css';
import { MdArrowRight } from 'react-icons/md';
import { bannersService } from '../../services/bannersService';
import type { Banner } from '../../types/banners';
import { formatEventDate } from '../../utils/dateUtils';

const Hero: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Fetch banners on mount
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const data = await bannersService.getHomepageHeroBanners();
        
        if (data.length === 0) {
          setError('No banners available at this time');
        } else {
          setBanners(data);
        }
      } catch (err: any) {
        console.error('Failed to fetch banners:', err);
        setError('Failed to load banners');
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
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  // Handle indicator click
  const handleIndicatorClick = (index: number) => {
    setCurrentSlide(index);
  };

  // Loading state
  if (loading) {
    return (
      <section className={styles.hero}>
        <div className={styles.wrapper}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.heroContentContainer}>
            <div className={styles.heroContentWrapper}>
              <div className={styles.heroContent}>
                <div className={styles.skeletonTag}></div>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonDescription}></div>
                <div className={styles.skeletonButton}></div>
              </div>
            </div>
          </div>
          <div className={styles.pagination}>
            <div className={styles.skeletonPagination}></div>
          </div>
          <div className={styles.carouselIndicators}>
            <div className={styles.skeletonIndicator}></div>
            <div className={styles.skeletonIndicator}></div>
            <div className={styles.skeletonIndicator}></div>
          </div>
        </div>
      </section>
    );
  }

  // Error or empty state - show fallback content
  if (error || banners.length === 0) {
    return (
      <section className={styles.hero}>
        <div className={styles.wrapper}>
          <img 
            src="/images/events/formula-1-hero.png" 
            alt="Sports Events" 
            className={styles.heroImage} 
          />
          <div className={styles.heroContentContainer}>
            <div className={styles.heroContentWrapper}>
              <div className={styles.heroContent}>
                <div className={styles.trendingTag}>TRENDING #1</div>
                <h1 className={styles.heroTitle}>Exciting Sports Events</h1>
                <p className={styles.heroDescription}>
                  Discover amazing sports events and book your tickets now
                </p>
                <a href="#events" className={styles.heroButton}>
                  <span>Explore Events</span>
                  <MdArrowRight />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentBanner = banners[currentSlide];
  const imageUrl = isMobile && currentBanner.mobile_image_url 
    ? currentBanner.mobile_image_url 
    : currentBanner.image_url;
  const formattedDate = formatEventDate(currentBanner.event_date);

  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        <img 
          src={imageUrl} 
          alt={currentBanner.title} 
          className={styles.heroImage} 
        />
        <div className={styles.heroContentContainer}>
          <div className={styles.heroContentWrapper}>
            <div className={styles.heroContent}>
              <div className={styles.trendingTag}>TRENDING #{currentSlide + 1}</div>
              <h1 className={styles.heroTitle}>{currentBanner.title}</h1>
              <p className={styles.heroDescription}>
                {currentBanner.description}
              </p>
              {formattedDate && (
                <p className={styles.eventDate}>
                  {formattedDate}
                </p>
              )}
              {currentBanner.link_url && currentBanner.link_target && (
                <a 
                  href={currentBanner.link_url} 
                  className={styles.heroButton}
                  target={currentBanner.link_target}
                  rel={currentBanner.link_target === '_blank' ? 'noopener noreferrer' : undefined}
                >
                  <span>Buy Tickets Now</span>
                  <MdArrowRight />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className={styles.pagination}>
          <div className={styles.paginationNumber}>
            {String(currentSlide + 1).padStart(2, '0')}
          </div>
          <div className={styles.paginationTotal}>
            {String(banners.length).padStart(2, '0')}
          </div>
        </div>
        
        {banners.length > 1 && (
          <div className={styles.carouselIndicators}>
            {banners.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentSlide ? styles.active : ''}`}
                onClick={() => handleIndicatorClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              ></button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
