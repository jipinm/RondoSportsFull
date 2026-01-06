import React, { useState, useEffect } from 'react';
import { MdExpandMore, MdExpandLess, MdSearch } from 'react-icons/md';
import styles from './FAQPage.module.css';
import { staticPagesService } from '../services/staticPagesService';
import type { StaticPage } from '../types/staticPages';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

/**
 * Parse HTML content from database to extract FAQ items
 * Expected format: <h2>Category</h2><h3>Question</h3><p>Answer</p>
 */
const parseFAQContent = (htmlContent: string): FAQItem[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const faqItems: FAQItem[] = [];
  let currentCategory = 'general';
  let idCounter = 1;

  // Get all elements in order
  const elements = doc.body.children;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    // h2 elements are categories
    if (element.tagName === 'H2') {
      currentCategory = element.textContent?.trim().toLowerCase().replace(/\s+/g, '_') || 'general';
    }

    // h3 elements are questions
    if (element.tagName === 'H3') {
      const question = element.textContent?.trim() || '';
      // Remove numbering like "1. " from questions
      const cleanQuestion = question.replace(/^\d+\.\s*/, '');
      
      // Look for the answer in the next element(s)
      let answer = '';
      let j = i + 1;
      
      // Collect all paragraphs and lists until next question or category
      while (j < elements.length && elements[j].tagName !== 'H2' && elements[j].tagName !== 'H3') {
        if (elements[j].tagName === 'P') {
          answer += elements[j].textContent?.trim() + '\n\n';
        } else if (elements[j].tagName === 'UL' || elements[j].tagName === 'OL') {
          const listItems = elements[j].querySelectorAll('li');
          answer += '\n';
          listItems.forEach(li => {
            answer += '• ' + li.textContent?.trim() + '\n';
          });
          answer += '\n';
        }
        j++;
      }

      if (cleanQuestion && answer.trim()) {
        faqItems.push({
          id: idCounter++,
          question: cleanQuestion,
          answer: answer.trim(),
          category: currentCategory
        });
      }
    }
  }

  return faqItems;
};

const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<StaticPage | null>(null);

  useEffect(() => {
    const fetchFAQ = async () => {
      try {
        setLoading(true);
        const data = await staticPagesService.getPageByKey('faq');
        
        if (data && data.content) {
          setPage(data);
          const parsedFAQs = parseFAQContent(data.content);
          setFaqData(parsedFAQs);
          setError(null);
        } else {
          setError('FAQ content not found.');
        }
      } catch (err) {
        console.error('Error loading FAQ:', err);
        setError('Failed to load FAQ. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFAQ();
  }, []);

  // Filter FAQs based on search query only
  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Toggle expanded state for FAQ items
  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className={styles.faqPage}>
        <section className={styles.heroSection}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading FAQ...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className={styles.faqPage}>
        <section className={styles.heroSection}>
          <div className={styles.container}>
            <div className={styles.error}>
              <h2>Unable to Load FAQ</h2>
              <p>{error || 'Content not available at this time.'}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.faqPage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Frequently Asked
              <span className={styles.titleHighlight}>Questions</span>
            </h1>
            <p className={styles.heroDescription}>
              Find quick answers to common questions about booking tickets, payments, 
              account management, and more. Can't find what you're looking for? Our support team is here to help.
            </p>
            
            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <MdSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content Section */}
      <section className={styles.faqContentSection}>
        <div className={styles.container}>
          {/* Results Header */}
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>
              All Questions
            </h2>
            <p className={styles.resultsCount}>
              {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>

          {/* FAQ List */}
          <div className={styles.faqList}>
            {filteredFAQs.length === 0 ? (
              <div className={styles.noResults}>
                <MdSearch className={styles.noResultsIcon} />
                <h3>No questions found</h3>
                <p>Try adjusting your search terms or browse a different category.</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className={styles.resetButton}
                >
                  Show All Questions
                </button>
              </div>
            ) : (
              filteredFAQs.map((faq) => (
                <div key={faq.id} className={styles.faqItem}>
                  <button
                    className={styles.faqQuestion}
                    onClick={() => toggleExpanded(faq.id)}
                    aria-expanded={expandedItems.includes(faq.id)}
                  >
                    <span className={styles.questionText}>{faq.question}</span>
                    <div className={styles.questionActions}>
                      {expandedItems.includes(faq.id) ? (
                        <MdExpandLess className={styles.expandIcon} />
                      ) : (
                        <MdExpandMore className={styles.expandIcon} />
                      )}
                    </div>
                  </button>
                  
                  {expandedItems.includes(faq.id) && (
                    <div className={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
