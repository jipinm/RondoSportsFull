-- --------------------------------------------------------
-- Migration: Add markup_type column to ticket_markups table
-- Purpose: Support both fixed amount ($) and percentage (%) markup types
-- Date: 2026-01-26
-- --------------------------------------------------------

-- Add markup_type column to specify the type of markup (fixed or percentage)
-- Default is 'fixed' for backward compatibility with existing records
ALTER TABLE `ticket_markups`
ADD COLUMN `markup_type` ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' 
COMMENT 'Type of markup: fixed (USD amount) or percentage (% of base price)'
AFTER `markup_price_usd`;

-- Add markup_percentage column to store the percentage value when markup_type is 'percentage'
ALTER TABLE `ticket_markups`
ADD COLUMN `markup_percentage` DECIMAL(5,2) NULL DEFAULT NULL
COMMENT 'Markup percentage (0-100%) when markup_type is percentage'
AFTER `markup_type`;

-- Add index for querying by markup type
CREATE INDEX `idx_markup_type` ON `ticket_markups` (`markup_type`);

-- Update comments
ALTER TABLE `ticket_markups`
MODIFY COLUMN `markup_price_usd` DECIMAL(10,2) NOT NULL 
COMMENT 'Calculated markup amount in USD (either fixed or calculated from percentage)';
