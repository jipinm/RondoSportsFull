import React, { useEffect, useState } from 'react';
import styles from './TermsConditionsPage.module.css';
import { staticPagesService } from '../services/staticPagesService';
import type { StaticPage } from '../types/staticPages';

const TermsConditionsPage: React.FC = () => {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTermsAndConditions = async () => {
      try {
        setLoading(true);
        const data = await staticPagesService.getTermsAndConditions();
        
        if (data) {
          setPage(data);
          setError(null);
        } else {
          setError('Terms & Conditions content not found.');
        }
      } catch (err) {
        console.error('Error loading terms and conditions:', err);
        setError('Failed to load Terms & Conditions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTermsAndConditions();
  }, []);

  if (loading) {
    return (
      <div className={styles.policyPage}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading Terms & Conditions...</p>
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
            <h2>Unable to Load Terms & Conditions</h2>
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

export default TermsConditionsPage;
