import React, { useState, useEffect, useRef } from 'react';
import { useCategories } from '../hooks/useCategories';
import styles from './VenueMap.module.css';

interface VenueMapProps {
  venueId: string;
  eventId: string;
  className?: string;
  externalHoveredCategory?: string | null; // New prop for external category highlighting
}

const VenueMap: React.FC<VenueMapProps> = ({ venueId, eventId, className, externalHoveredCategory }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch categories for interactivity
  const { categories, loading: categoriesLoading } = useCategories({ event_id: eventId });

  // Helper function to escape CSS selectors
  const escapeCSSSelector = (id: string): string => {
    // Use CSS.escape if available, otherwise fallback to manual escaping
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(id);
    }
    
    // Manual escaping for older browsers
    return id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
             .replace(/^(\d)/, '\\3$1 '); // Escape leading digits
  };

  // Fetch SVG content
  useEffect(() => {
    const fetchSvg = async () => {
      if (!venueId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const baseUrl = 'https://cdn.xs2event.com'; // This is CDN for venue images. SO it is hard coded.
        const svgUrl = `${baseUrl.replace('/v1', '')}/venues/${venueId}.svg`;
        const response = await fetch(svgUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch venue SVG: ${response.status}`);
        }
        
        const svgText = await response.text();
        setSvgContent(svgText);
        
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to fetch venue map';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSvg();
  }, [venueId]);

  // Apply category highlighting
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent || categoriesLoading) return;

    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Reset all category highlights
    categories.forEach(category => {
      const escapedId = escapeCSSSelector(category.category_id);
      const categoryElements = svgElement.querySelectorAll(`.${escapedId}, ._${escapedId}`);
      categoryElements.forEach(el => {
        (el as HTMLElement).classList.remove('highlighted');
      });
    });

    // Highlight hovered category (prioritize external hover over internal hover)
    const activeHoveredCategory = externalHoveredCategory || hoveredCategory;
    if (activeHoveredCategory) {
      const escapedHoveredId = escapeCSSSelector(activeHoveredCategory);
      const categoryElements = svgElement.querySelectorAll(`.${escapedHoveredId}, ._${escapedHoveredId}`);
      categoryElements.forEach(el => {
        (el as HTMLElement).classList.add('highlighted');
      });
    }
  }, [hoveredCategory, externalHoveredCategory, svgContent, categories, categoriesLoading]);

  // Add click handlers to SVG elements
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;

    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const handleCategoryClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.classList) return;

      // Find category ID from classes
      const categoryId = Array.from(target.classList).find(className => 
        className.endsWith('_ctg') || categories.some(cat => 
          className === cat.category_id || className === `_${cat.category_id}`
        )
      );

      if (categoryId) {
        const cleanCategoryId = categoryId.replace(/^_/, '').replace(/_ctg$/, '');
        const category = categories.find(cat => cat.category_id === cleanCategoryId);
        if (category) {
          // TODO: Handle category click (show details, navigate to tickets, etc.)
        }
      }
    };

    svgElement.addEventListener('click', handleCategoryClick);

    return () => {
      svgElement.removeEventListener('click', handleCategoryClick);
    };
  }, [svgContent, categories]);

  if (loading) {
    return (
      <div className={`${styles.venueMapContainer} ${className || ''}`}>
        <div className={styles.skeletonVenueMapContainer}>
          <div className={styles.skeletonMapControls}>
            <div className={styles.skeletonMapTitle}></div>
            <div className={styles.skeletonMapSubtitle}></div>
          </div>
          
          <div className={styles.skeletonSvgContainer}>
            <div className={styles.skeletonVenueMapPlaceholder}>
              <div className={styles.skeletonVenueIcon}></div>
            </div>
          </div>
          
          <div className={styles.skeletonCategoryLegend}>
            <div className={styles.skeletonLegendTitle}></div>
            <div className={styles.skeletonCategoryList}>
              {[...Array(4)].map((_, index) => (
                <div key={index} className={styles.skeletonCategoryItem}>
                  <div className={styles.skeletonCategoryColor}></div>
                  <div className={styles.skeletonCategoryName}></div>
                  <div className={styles.skeletonCategoryPrice}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.venueMapContainer} ${className || ''}`}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>🏟️</div>
          <p>Unable to load venue map</p>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className={`${styles.venueMapContainer} ${className || ''}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏟️</div>
          <p>No venue map available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.venueMapContainer} ${className || ''}`}>
      <div className={styles.mapControls}>
        <div className={styles.mapTitle}>
          <h3>Venue Map</h3>
        </div>
      </div>
      
      <div 
        ref={svgContainerRef}
        className={styles.svgContainer}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      
      {categories.length > 0 && (
        <div className={styles.categoryLegend}>
          <h4>Categories</h4>
          <div className={styles.categoryList}>
            {categories.map(category => (
              <div
                key={category.category_id}
                className={`${styles.categoryItem} ${hoveredCategory === category.category_id ? styles.active : ''}`}
                onMouseEnter={() => setHoveredCategory(category.category_id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div 
                  className={`${styles.categoryColor} ${styles[`category_${category.category_type || 'default'}`]}`}
                ></div>
                <span className={styles.categoryName}>{category.category_name}</span>
                {/* Note: Price information would come from tickets data, not categories */}
                <span className={styles.categoryPrice}>
                  {category.category_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueMap;
