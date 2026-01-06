import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginPage.module.css';

// Define the slider content interface
interface SliderItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}

const LoginPage: React.FC = () => {
  const { isAuthenticated, login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  
  // Slider content data
  const sliderItems: SliderItem[] = [
    {
      id: 1,
      title: 'English Premier League',
      subtitle: 'The world\'s most-watched football league',
      imageUrl: '/assets/images/epl.jpg'
    },
    {
      id: 2,
      title: 'Formula 1',
      subtitle: 'Experience the thrill of speed',
      imageUrl: '/assets/images/f1.jpg'
    },
    {
      id: 3,
      title: 'UEFA Champions League',
      subtitle: 'Europe\'s premier club football tournament',
      imageUrl: '/assets/images/ucl.jpg'
    },
    {
      id: 4,
      title: 'Tennis Grand Slams',
      subtitle: 'The most prestigious tennis tournaments',
      imageUrl: '/assets/images/tennis.jpg'
    },
    {
      id: 5,
      title: 'NBA Finals',
      subtitle: 'The pinnacle of basketball excellence',
      imageUrl: '/assets/images/nba.jpg'
    },
    {
      id: 6,
      title: 'Olympic Games',
      subtitle: 'The world\'s foremost sports competition',
      imageUrl: '/assets/images/olympics.jpg'
    },
    {
      id: 7,
      title: 'FIFA World Cup 2026',
      subtitle: 'The biggest football tournament on earth',
      imageUrl: '/assets/images/fifa.jpg'
    }
  ];  
  
  // Auto-scroll effect for the slider with pause on hover
  useEffect(() => {
    const slideshowElement = slideshowRef.current;
    let interval: number;
    let isPaused = false;
    
    // Start the auto-scroll
    const startInterval = () => {
      interval = window.setInterval(() => {
        if (!isPaused) {
          setActiveSlide((prevSlide) => {
            const newSlide = (prevSlide + 1) % sliderItems.length;
            console.log('Changing slide to:', newSlide);
            return newSlide;
          });
        }
      }, 3000);
    };
    
    // Set initial slide to ensure visibility
    setActiveSlide(0);
    
    // Start the interval
    startInterval();
    
    // Pause on hover
    const handleMouseEnter = () => {
      isPaused = true;
    };
    
    // Resume on mouse leave
    const handleMouseLeave = () => {
      isPaused = false;
    };
    
    // Add event listeners if the element exists
    if (slideshowElement) {
      slideshowElement.addEventListener('mouseenter', handleMouseEnter);
      slideshowElement.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      clearInterval(interval);
      // Clean up event listeners
      if (slideshowElement) {
        slideshowElement.removeEventListener('mouseenter', handleMouseEnter);
        slideshowElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [sliderItems.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    const success = await login(email, password);
    if (!success) {
      // Error is handled by the AuthContext
      console.log('Login failed');
    }
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }  return (
    <div className={styles.loginPageWrapper}>
      <div className={styles.loginContainer}>
        {/* Left side - Slider Section */}
        <div className={styles.sliderSection}>
          {/* Hard-coded first slide to ensure visibility */}
          <div className={styles.sliderContainer}>
            <div className={styles.sliderVisibleWindow}>
              <div className={styles.slideshow} ref={slideshowRef}>
                {sliderItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`${styles.slide} ${index === activeSlide ? styles.active : ''}`}
                    style={{
                      display: index === activeSlide ? 'block' : 'none'
                    }}
                  >                    <div className={styles.slideContent}>
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className={styles.slideImage} 
                      />
                      <div className={styles.slideTitle}>
                        {item.title.split(' ').map((word, i) => (
                          <div key={i} className={styles.titleText}>{word}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.slideIndicators}>
              {sliderItems.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${index === activeSlide ? styles.activeIndicator : ''}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Login Form Section */}
        <div className={styles.formSection}>
          <div className={styles.loginFormWrapper}>
            <div className={styles.logoContainer}>
              <h1 className={styles.logo}>Rondo Sports Admin</h1>
              <p className={styles.tagline}>Event's Ticket Management</p>
            </div>

            <h2 className={styles.loginTitle}>Login</h2>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.formInput}
                  placeholder="your email@example.com"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.formInput}
                  placeholder="Your password"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className={styles.loginButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.loadingSpinner}></span>
                    Logging in...
                  </>
                ) : 'Login'}
              </button>
            </form>
              <div className={styles.loginHelp}>
              <p className={styles.testCredentials}>
                For demo purposes, use:
                <br />
                Email: admin@example.com
                <br />
                Password: admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
