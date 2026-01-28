-- --------------------------------------------------------
-- Table: ticket_markups
-- Purpose: Store markup pricing for event tickets in USD
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ticket_markups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(100) NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) NOT NULL COMMENT 'XS2Event ticket ID',
  `markup_price_usd` decimal(10,2) NOT NULL COMMENT 'Markup amount in USD',
  `base_price_usd` decimal(10,2) NOT NULL COMMENT 'Original ticket price in USD (for reference)',
  `final_price_usd` decimal(10,2) NOT NULL COMMENT 'Base + Markup in USD',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who created markup',
  `updated_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who last updated markup',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_ticket` (`event_id`, `ticket_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  CONSTRAINT `fk_markup_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_markup_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event ticket markup pricing management';

-- Index for quick lookups by event
CREATE INDEX `idx_event_created` ON `ticket_markups` (`event_id`, `created_at`);

-- Index for audit trail
CREATE INDEX `idx_updated_at` ON `ticket_markups` (`updated_at`);
