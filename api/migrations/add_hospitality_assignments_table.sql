-- Migration: Add hierarchical hospitality_assignments table
-- Date: 2026-02-12
-- Description: Supports hospitality service assignment at sport, tournament, team, event, and ticket levels
--              with most-specific-wins override logic (identical to markup_rules hierarchy).
--              The existing ticket_hospitalities table is preserved for backward compatibility
--              and treated as legacy "ticket-level" assignments.

-- Step 1: Create the new hierarchical hospitality_assignments table
CREATE TABLE IF NOT EXISTS `hospitality_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  
  -- Which hospitality service is being assigned
  `hospitality_id` bigint(20) unsigned NOT NULL COMMENT 'FK to hospitalities table',
  
  -- Hierarchy level identifiers (nullable - set only the level being targeted)
  `sport_type` varchar(100) DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  
  -- Descriptive metadata (for admin display, not used in resolution logic)
  `sport_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the ticket category',
  
  -- The resolved hierarchy level (computed, for quick filtering)
  `level` enum('sport','tournament','team','event','ticket') NOT NULL COMMENT 'The hierarchy level this assignment targets',
  
  -- Audit fields
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this assignment is currently active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  
  -- Prevent duplicate assignments of the same hospitality at the same scope
  UNIQUE KEY `unique_hospitality_scope` (`hospitality_id`, `sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`),
  
  -- Indexes for hierarchy resolution queries
  KEY `idx_hospitality_id` (`hospitality_id`),
  KEY `idx_ha_sport_type` (`sport_type`),
  KEY `idx_ha_tournament_id` (`tournament_id`),
  KEY `idx_ha_team_id` (`team_id`),
  KEY `idx_ha_event_id` (`event_id`),
  KEY `idx_ha_ticket_id` (`ticket_id`),
  KEY `idx_ha_level` (`level`),
  KEY `idx_ha_is_active` (`is_active`),
  KEY `idx_ha_created_by` (`created_by`),
  KEY `idx_ha_updated_by` (`updated_by`),
  
  CONSTRAINT `fk_ha_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ha_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ha_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical hospitality service assignments (sport > tournament > team > event > ticket)';

-- Step 2: Migrate existing ticket_hospitalities data into the new table
-- Each existing row maps to a ticket-level assignment
INSERT IGNORE INTO `hospitality_assignments` (
  `hospitality_id`, `event_id`, `ticket_id`, `level`,
  `created_by`, `created_at`
)
SELECT 
  th.`hospitality_id`,
  th.`event_id`,
  th.`ticket_id`,
  'ticket' as `level`,
  th.`created_by`,
  th.`created_at`
FROM `ticket_hospitalities` th
INNER JOIN `hospitalities` h ON th.`hospitality_id` = h.`id`;

-- Step 3 (Optional): Make price_usd nullable on hospitalities table for new services
-- We keep the column for backward compatibility with booking_hospitalities
-- but new services no longer require a price
ALTER TABLE `hospitalities` 
  MODIFY COLUMN `price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Legacy price field - no longer used for new services';
