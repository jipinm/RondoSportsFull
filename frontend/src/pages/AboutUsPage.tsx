import React, { useEffect, useState } from 'react';
import styles from './AboutUsPage.module.css';
import { staticPagesService } from '../services/staticPagesService';
import type { StaticPage } from '../types/staticPages';

const AboutUsPage: React.FC = () => {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        setLoading(true);
        const data = await staticPagesService.getAboutUs();
        
        if (data) {
          setPage(data);
          setError(null);
        } else {
          setError('About Us content not found.');
        }
      } catch (err) {
        console.error('Error loading about us page:', err);
        setError('Failed to load About Us. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutUs();
  }, []);

  if (loading) {
    return (
      <div className={styles.aboutPage}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading About Us...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className={styles.aboutPage}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Unable to Load About Us</h2>
            <p>{error || 'Content not available at this time.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.aboutPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{page.title}</h1>
        </header>

        <div 
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
};

export default AboutUsPage;
