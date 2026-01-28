-- Migration: Consolidate static_pages into cms_pages
-- Date: 2026-01-28
-- Description: Copies FAQ data from static_pages to cms_pages and prepares for using only cms_pages table

-- Step 1: Insert FAQ page into cms_pages if it doesn't exist
INSERT INTO `cms_pages` (`page_key`, `title`, `slug`, `content`, `excerpt`, `status`, `meta_title`, `meta_description`, `meta_keywords`, `content_type`, `template`, `featured_image`, `published_at`, `scheduled_publish_at`, `last_edited_by`, `view_count`, `last_viewed_at`, `created_at`, `updated_at`)
SELECT 
    'faq',
    'FAQ - Frequently Asked Questions',
    'faq',
    sp.content,
    NULL,
    'published',
    sp.meta_title,
    sp.meta_description,
    sp.meta_keywords,
    'rich_text',
    'default',
    NULL,
    NOW(),
    NULL,
    sp.updated_by,
    0,
    NULL,
    sp.created_at,
    sp.updated_at
FROM static_pages sp
WHERE sp.page_key = 'faq'
AND NOT EXISTS (SELECT 1 FROM cms_pages WHERE page_key = 'faq');

-- Step 2: Update existing cms_pages entries with latest content from static_pages if they were updated more recently
-- Update terms page
UPDATE cms_pages cp
INNER JOIN static_pages sp ON sp.page_key = 'terms'
SET 
    cp.content = sp.content,
    cp.meta_title = COALESCE(sp.meta_title, cp.meta_title),
    cp.meta_description = COALESCE(sp.meta_description, cp.meta_description),
    cp.updated_at = GREATEST(cp.updated_at, sp.updated_at)
WHERE cp.page_key = 'terms' AND sp.updated_at > cp.updated_at;

-- Update privacy page
UPDATE cms_pages cp
INNER JOIN static_pages sp ON sp.page_key = 'privacy'
SET 
    cp.content = sp.content,
    cp.meta_title = COALESCE(sp.meta_title, cp.meta_title),
    cp.meta_description = COALESCE(sp.meta_description, cp.meta_description),
    cp.updated_at = GREATEST(cp.updated_at, sp.updated_at)
WHERE cp.page_key = 'privacy' AND sp.updated_at > cp.updated_at;

-- Step 3: Verify migration
SELECT page_key, title, status, updated_at FROM cms_pages ORDER BY page_key;

-- Note: After verifying the migration is successful, you can optionally drop the static_pages table:
-- DROP TABLE IF EXISTS static_pages;
