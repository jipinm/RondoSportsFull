import React, { useEffect, useState } from 'react';
import styles from './PrivacyPolicyPage.module.css';
import { staticPagesService } from '../services/staticPagesService';
import type { StaticPage } from '../types/staticPages';

const PrivacyPolicyPage: React.FC = () => {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        setLoading(true);
        const data = await staticPagesService.getPrivacyPolicy();
        
        if (data) {
          setPage(data);
          setError(null);
        } else {
          setError('Privacy Policy content not found.');
        }
      } catch (err) {
        console.error('Error loading privacy policy:', err);
        setError('Failed to load Privacy Policy. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);

  if (loading) {
    return (
      <div className={styles.policyPage}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading Privacy Policy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className={styles.policyPage}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Unable to Load Privacy Policy</h2>
            <p>{error || 'Content not available at this time.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.policyPage}>
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

export default PrivacyPolicyPage;
