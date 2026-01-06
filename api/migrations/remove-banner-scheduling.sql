-- Migration: Remove Banner Scheduling Functionality
-- Date: 2025-12-20
-- Description: Replace start_date and end_date with event_date, remove scheduled status

-- Step 1: Add the new event_date column
ALTER TABLE `banners`
ADD COLUMN `event_date` DATE NULL DEFAULT NULL COMMENT 'Event date for display purposes' AFTER `location`;

-- Step 2: Migrate existing start_date data to event_date (use start_date as the event date)
UPDATE `banners`
SET `event_date` = DATE(`start_date`)
WHERE `start_date` IS NOT NULL;

-- Step 3: Update any 'scheduled' status banners to 'inactive'
UPDATE `banners`
SET `status` = 'inactive'
WHERE `status` = 'scheduled';

-- Step 4: Drop the old columns
ALTER TABLE `banners`
DROP COLUMN `start_date`,
DROP COLUMN `end_date`;

-- Step 5: Update the status enum to remove 'scheduled'
ALTER TABLE `banners`
MODIFY COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Banner status';

-- Step 6: Drop the old date index (if it exists)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() AND table_name = 'banners' AND index_name = 'idx_dates');
SET @sql = IF(@index_exists > 0, 'ALTER TABLE `banners` DROP INDEX `idx_dates`', 'SELECT "Index idx_dates does not exist, skipping..." AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Add index for event_date (if it doesn't already exist)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() AND table_name = 'banners' AND index_name = 'idx_event_date');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `banners` ADD INDEX `idx_event_date` (`event_date`)', 'SELECT "Index idx_event_date already exists, skipping..." AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification queries
-- SELECT id, title, status, event_date, created_at FROM banners ORDER BY id;
-- SHOW CREATE TABLE banners;
