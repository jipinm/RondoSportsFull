-- Migration: Add hierarchical markup_rules table
-- Date: 2026-02-12
-- Description: Supports markup pricing at sport, tournament, team, event, and ticket levels
--              with most-specific-wins override logic.
--              The existing ticket_markups table is preserved for backward compatibility.

CREATE TABLE IF NOT EXISTS `markup_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  
  -- Hierarchy level identifiers (nullable - set only the level being targeted)
  `sport_type` varchar(100) DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  
  -- Markup configuration
  `markup_type` enum('fixed','percentage') NOT NULL DEFAULT 'fixed' COMMENT 'Type of markup: fixed USD amount or percentage of base price',
  `markup_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Fixed amount in USD or percentage value depending on markup_type',
  
  -- Descriptive metadata (for admin display, not used in resolution logic)
  `sport_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the ticket category',
  
  -- The resolved hierarchy level (computed, for quick filtering)
  `level` enum('sport','tournament','team','event','ticket') NOT NULL COMMENT 'The hierarchy level this rule applies to',
  
  -- Audit fields
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this rule is currently active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  
  -- Prevent duplicate rules at the same scope
  UNIQUE KEY `unique_markup_scope` (`sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`),
  
  -- Indexes for hierarchy resolution queries
  KEY `idx_sport_type` (`sport_type`),
  KEY `idx_tournament_id` (`tournament_id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_level` (`level`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  
  CONSTRAINT `fk_markup_rule_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_markup_rule_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical markup pricing rules (sport > tournament > team > event > ticket)';
