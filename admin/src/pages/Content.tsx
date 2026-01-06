// filepath: e:\RondoSportsAdminCopilot\src\pages\Content.tsx
import React, { useState, useEffect } from 'react';
import { File, Edit, Save, Image, AlertCircle, Loader } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BannerList } from '../components/banners';
import staticPagesService, { type StaticPage } from '../services/staticPagesService';
import styles from './Content.module.css';

// Utility functions for HTML/Markdown conversion
const htmlToMarkdown = (html: string): string => {
  // Simple HTML to Markdown conversion for basic elements
  let markdown = html
    .replace(/<h([1-6])>/g, (_, level) => '#'.repeat(parseInt(level)) + ' ')
    .replace(/<\/h[1-6]>/g, '\n\n')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<strong>/g, '**')
    .replace(/<\/strong>/g, '**')
    .replace(/<em>/g, '*')
    .replace(/<\/em>/g, '*')
    .replace(/<ul>/g, '')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol>/g, '')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '[$2]($1)');
  
  return markdown.trim();
};

const markdownToHtml = (markdown: string): string => {
  return DOMPurify.sanitize(marked.parse(markdown) as string);
};

const Content: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pages' | 'banners'>('pages');
  const [selectedPage, setSelectedPage] = useState<'terms' | 'privacy' | 'faq'>('terms');
  const [isEditing, setIsEditing] = useState(false);
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [currentPage, setCurrentPage] = useState<StaticPage | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load static pages on component mount
  useEffect(() => {
    if (activeTab === 'pages') {
      loadStaticPages();
    }
  }, [activeTab]);

  // Load selected page content when selectedPage changes
  useEffect(() => {
    if (staticPages.length > 0) {
      const page = staticPages.find(p => p.page_key === selectedPage);
      if (page) {
        setCurrentPage(page);
        // Set content as HTML for preview mode
        setCurrentContent(page.content);
        // Reset editing mode when changing pages
        setIsEditing(false);
      }
    }
  }, [selectedPage, staticPages]);

  // Load static pages from API
  const loadStaticPages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await staticPagesService.getAllPages();
      
      if (result.success && result.data) {
        setStaticPages(Array.isArray(result.data) ? result.data : [result.data]);
      } else {
        setError(result.error || 'Failed to load static pages');
      }
    } catch (err) {
      setError('Failed to load static pages');
      console.error('Error loading static pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'pages' | 'banners') => {
    setActiveTab(tab);
    setIsEditing(false);
    
    if (tab === 'pages') {
      handlePageSelect(selectedPage);
    }
  };
  
  const handlePageSelect = (page: 'terms' | 'privacy' | 'faq') => {
    setSelectedPage(page);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    
    // Content will be set via useEffect when selectedPage changes
  };
  
  const handleEditToggle = () => {
    if (!isEditing && currentPage) {
      // Convert HTML to Markdown when entering edit mode
      setCurrentContent(htmlToMarkdown(currentPage.content));
    }
    setIsEditing(!isEditing);
  };
  
  const handleContentChange = (content: string) => {
    setCurrentContent(content);
  };

  const handleSaveContent = async () => {
    if (!currentPage) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert Markdown to HTML before saving
      const htmlContent = markdownToHtml(currentContent);
      
      const result = await staticPagesService.updatePage(currentPage.id, {
        content: htmlContent
      });
      
      if (result.success) {
        setSuccess('Content saved successfully!');
        setIsEditing(false);
        
        // Update the current page in state
        if (result.data) {
          const updatedPage = result.data as StaticPage;
          setCurrentPage(updatedPage);
          setCurrentContent(updatedPage.content); // Set HTML content for preview
          setStaticPages(prev => 
            prev.map(page => page.id === updatedPage.id ? updatedPage : page)
          );
        }
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to save content');
      }
    } catch (err) {
      setError('Failed to save content');
      console.error('Error saving content:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.contentContainer}>
      <h1 className={styles.pageTitle}>Content Management</h1>
      
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'pages' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('pages')}
        >
          <File size={18} />
          <span>Pages</span>
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'banners' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('banners')}
        >
          <Image size={18} />
          <span>Banners & Promotions</span>
        </button>
      </div>
      
      {activeTab === 'pages' ? (
        <div className={styles.pagesContent}>
          <div className={styles.pagesSidebar}>
            <h2 className={styles.sidebarTitle}>Static Pages</h2>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Loader size={20} className={styles.spinner} />
                <span>Loading pages...</span>
              </div>
            ) : (
              <div className={styles.pagesList}>
                <button 
                  className={`${styles.pageItem} ${selectedPage === 'terms' ? styles.activePage : ''}`}
                  onClick={() => handlePageSelect('terms')}
                >
                  Terms & Conditions
                </button>
                <button 
                  className={`${styles.pageItem} ${selectedPage === 'privacy' ? styles.activePage : ''}`}
                  onClick={() => handlePageSelect('privacy')}
                >
                  Privacy Policy
                </button>
                <button 
                  className={`${styles.pageItem} ${selectedPage === 'faq' ? styles.activePage : ''}`}
                  onClick={() => handlePageSelect('faq')}
                >
                  FAQ - Frequently Asked Questions
                </button>
              </div>
            )}
          </div>
          
          <div className={styles.pageContentSection}>
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className={styles.successMessage}>
                <span>✅ {success}</span>
              </div>
            )}
            
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>
                {currentPage ? currentPage.title : (
                  selectedPage === 'terms' ? 'Terms & Conditions' : 
                  selectedPage === 'privacy' ? 'Privacy Policy' : 
                  'FAQ - Frequently Asked Questions'
                )}
              </h2>
              <button 
                className={isEditing ? styles.saveButton : styles.editButton}
                onClick={isEditing ? handleSaveContent : handleEditToggle}
                disabled={saving || loading || !currentPage}
              >
                {saving ? (
                  <>
                    <Loader size={16} className={styles.spinner} /> Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save size={16} /> Save
                  </>
                ) : (
                  <>
                    <Edit size={16} /> Edit
                  </>
                )}
              </button>
            </div>
            
            <div className={styles.editorContainer}>
              {loading ? (
                <div className={styles.loadingContent}>
                  <Loader size={24} className={styles.spinner} />
                  <span>Loading content...</span>
                </div>
              ) : isEditing ? (
                <div className={styles.wysiwygContainer}>
                  <MDEditor
                    value={currentContent || ''}
                    onChange={(val) => handleContentChange(val || '')}
                    preview="edit"
                    hideToolbar={false}
                    data-color-mode="light"
                    className={styles.mdEditor}
                  />
                </div>
              ) : (
                <div 
                  className={`${styles.contentPreview} ${selectedPage === 'privacy' ? styles.privacyContent : ''}`}
                  dangerouslySetInnerHTML={{ __html: currentContent || '<p>No content available.</p>' }}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <BannerList />
      )}
    </div>
  );
};

export default Content;
