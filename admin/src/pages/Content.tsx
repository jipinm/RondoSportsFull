// filepath: e:\RondoSportsAdminCopilot\src\pages\Content.tsx
import React, { useState, useEffect, useRef } from 'react';
import { File, Edit, Save, Image, AlertCircle, Loader } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import { BannerList } from '../components/banners';
import staticPagesService, { type StaticPage } from '../services/staticPagesService';
import styles from './Content.module.css';

// Utility function to sanitize HTML content
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html);
};

const Content: React.FC = () => {
  const editorRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'pages' | 'banners'>('pages');
  const [selectedPage, setSelectedPage] = useState<'terms' | 'privacy' | 'about' | 'faq'>('terms');
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
  
  const handlePageSelect = (page: 'terms' | 'privacy' | 'about' | 'faq') => {
    setSelectedPage(page);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    
    // Content will be set via useEffect when selectedPage changes
  };
  
  const handleEditToggle = () => {
    if (!isEditing && currentPage) {
      // TinyMCE works directly with HTML, no conversion needed
      setCurrentContent(currentPage.content);
    }
    setIsEditing(!isEditing);
  };
  
  const handleEditorChange = (content: string) => {
    setCurrentContent(content);
  };

  const handleSaveContent = async () => {
    if (!currentPage) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Sanitize HTML content before saving
      const htmlContent = sanitizeHtml(currentContent);
      
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
                  className={`${styles.pageItem} ${selectedPage === 'about' ? styles.activePage : ''}`}
                  onClick={() => handlePageSelect('about')}
                >
                  About Us
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
                  selectedPage === 'about' ? 'About Us' :
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
                  <Editor
                    key={`editor-${selectedPage}`}
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    onInit={(_evt, editor) => editorRef.current = editor}
                    initialValue={currentContent || ''}
                    onEditorChange={handleEditorChange}
                    textareaName="content-editor"
                    init={{
                      height: 500,
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image table | removeformat | code | help',
                      content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; }',
                      skin: 'oxide',
                      content_css: 'default',
                      branding: false,
                      promotion: false,
                      resize: true,
                      statusbar: true,
                      elementpath: true,
                      setup: (editor: any) => {
                        editor.on('init', () => {
                          // Hide the source textarea when editor is ready
                          const container = editor.getContainer();
                          if (container && container.previousSibling) {
                            const textarea = container.previousSibling as HTMLElement;
                            if (textarea.tagName === 'TEXTAREA') {
                              textarea.style.display = 'none';
                            }
                          }
                        });
                      }
                    }}
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
