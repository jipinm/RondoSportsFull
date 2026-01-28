-- --------------------------------------------------------
-- Table: hospitalities
-- Purpose: Store hospitality services that can be added to tickets
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `hospitalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Name of the hospitality service',
  `description` text DEFAULT NULL COMMENT 'Description of what the service includes',
  `price_usd` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Price of the service in USD',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the service is currently available',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Display order for the service',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who created the service',
  `updated_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who last updated the service',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  CONSTRAINT `fk_hospitality_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hospitality_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services management';


-- --------------------------------------------------------
-- Table: ticket_hospitalities
-- Purpose: Many-to-many mapping between tickets and hospitality services
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ticket_hospitalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(100) NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) NOT NULL COMMENT 'XS2Event ticket ID',
  `hospitality_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to hospitality service',
  `custom_price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Optional custom price override for this ticket',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who created the assignment',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ticket_hospitality` (`event_id`, `ticket_id`, `hospitality_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_hospitality_id` (`hospitality_id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_ticket_hospitality_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_hospitality_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticket to hospitality service mappings';

-- Index for quick lookups by event
CREATE INDEX `idx_event_ticket` ON `ticket_hospitalities` (`event_id`, `ticket_id`);
