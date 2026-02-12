-- --------------------------------------------------------
-- Safe Migration Script for Rondo Sports Platform
-- Handles foreign key constraints properly
-- Date: February 13, 2026
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ========================================================================
-- STEP 1: Drop dependent tables first (child tables with foreign keys)
-- ========================================================================

-- Drop booking_hospitalities (depends on hospitalities and bookings)
DROP TABLE IF EXISTS `booking_hospitalities`;

-- Drop hospitality_assignments (depends on hospitalities)
DROP TABLE IF EXISTS `hospitality_assignments`;

-- Drop ticket_hospitalities (depends on hospitalities)
DROP TABLE IF EXISTS `ticket_hospitalities`;

-- Drop ticket_markups
DROP TABLE IF EXISTS `ticket_markups`;

-- Drop markup_rules
DROP TABLE IF EXISTS `markup_rules`;

-- ========================================================================
-- STEP 2: Drop parent tables
-- ========================================================================

-- Drop hospitalities (parent table)
DROP TABLE IF EXISTS `hospitalities`;

-- Drop currencies
DROP TABLE IF EXISTS `currencies`;

-- ========================================================================
-- STEP 3: Create parent tables first
-- ========================================================================

-- Dumping structure for table rondo.currencies
CREATE TABLE IF NOT EXISTS `currencies` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(3) NOT NULL COMMENT 'ISO 4217 currency code (e.g., USD, EUR)',
  `name` varchar(100) NOT NULL COMMENT 'Full currency name',
  `symbol` varchar(10) NOT NULL COMMENT 'Currency symbol (e.g., $, €, £)',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether currency is available for selection',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default currency',
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Display order',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(10) unsigned DEFAULT NULL COMMENT 'Admin who created this currency',
  `updated_by` int(10) unsigned DEFAULT NULL COMMENT 'Admin who last updated this currency',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Currency management for the platform';

-- Dumping data for table rondo.currencies
INSERT INTO `currencies` (`id`, `code`, `name`, `symbol`, `is_active`, `is_default`, `sort_order`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
	(1, 'USD', 'US Dollar', '$', 1, 1, 1, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(2, 'EUR', 'Euro', '€', 1, 0, 2, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(3, 'GBP', 'British Pound', '£', 1, 0, 3, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(5, 'INR', 'Indian Rupee', '₹', 0, 0, 5, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(8, 'AUD', 'Australian Dollar', 'A$', 0, 0, 8, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(9, 'CAD', 'Canadian Dollar', 'C$', 0, 0, 9, '2026-02-11 17:23:47', '2026-02-12 04:27:45', NULL, NULL),
	(10, 'JPY', 'Japanese Yen', '¥', 0, 0, 10, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
	(12, 'BRL', 'Brazilian Real', 'BR$', 1, 0, 6, '2026-02-12 04:41:31', '2026-02-12 04:41:31', 3, NULL);

-- Dumping structure for table rondo.hospitalities
CREATE TABLE IF NOT EXISTS `hospitalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Name of the hospitality service',
  `description` text DEFAULT NULL COMMENT 'Description of what the service includes',
  `price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Legacy price field - no longer used for new services',
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services management';

-- Dumping data for table rondo.hospitalities
INSERT INTO `hospitalities` (`id`, `name`, `description`, `price_usd`, `is_active`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
	(1, 'VIP lounge Access', 'You can enter the VIP area.', 100.00, 1, 1, 3, 3, '2026-01-22 06:52:13', '2026-01-22 06:52:29'),
	(2, 'Whole day Food', 'Full meal for the event day', 25.00, 1, 2, 3, 3, '2026-01-22 06:53:19', '2026-01-22 06:53:19'),
	(3, 'Drinking Water', '2 bottles of drinking water will be delivered during the break time.', 0.00, 1, 3, 3, 3, '2026-02-12 17:10:59', '2026-02-12 17:11:11');

-- ========================================================================
-- STEP 4: Create dependent tables (child tables with foreign keys)
-- ========================================================================

-- Dumping structure for table rondo.markup_rules
CREATE TABLE IF NOT EXISTS `markup_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sport_type` varchar(100) DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  `markup_type` enum('fixed','percentage') NOT NULL DEFAULT 'fixed' COMMENT 'Type of markup: fixed USD amount or percentage of base price',
  `markup_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Fixed amount in USD or percentage value depending on markup_type',
  `sport_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the ticket category',
  `level` enum('sport','tournament','team','event','ticket') NOT NULL COMMENT 'The hierarchy level this rule applies to',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this rule is currently active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_markup_scope` (`sport_type`,`tournament_id`,`team_id`,`event_id`,`ticket_id`),
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical markup pricing rules (sport > tournament > team > event > ticket)';

-- Dumping data for table rondo.markup_rules
INSERT INTO `markup_rules` (`id`, `sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`, `markup_type`, `markup_amount`, `sport_name`, `tournament_name`, `team_name`, `event_name`, `ticket_name`, `level`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
	(1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 'fixed', 10.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', 'Executive Lounge', 'ticket', 1, 3, 3, '2026-02-12 10:08:47', '2026-02-12 10:08:47'),
	(2, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', NULL, 'fixed', 20.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', NULL, 'event', 1, 3, 3, '2026-02-12 10:09:03', '2026-02-12 10:09:03'),
	(3, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', NULL, NULL, 'fixed', 30.00, 'Soccer', 'Premier League', 'Manchester United', NULL, NULL, 'team', 1, 3, 3, '2026-02-12 10:09:14', '2026-02-12 10:09:14'),
	(4, 'soccer', 'f306f395644a42e09821253d13637d70_trn', NULL, NULL, NULL, 'fixed', 40.00, 'Soccer', 'Premier League', NULL, NULL, NULL, 'tournament', 1, 3, 3, '2026-02-12 10:09:21', '2026-02-12 10:09:21'),
	(5, 'soccer', NULL, NULL, NULL, NULL, 'fixed', 50.00, 'Soccer', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-12 10:09:27', '2026-02-12 10:09:58'),
	(6, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '764dd883de654f60aadf5fe872cadd4a_gnr', 'c4d8eba21b964f06bc5b80da69e3b8dc_spp', 'percentage', 25.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Liverpool FC', 'Ticket Plus', 'ticket', 1, 3, 3, '2026-02-12 10:10:52', '2026-02-12 10:10:52');

-- Dumping structure for table rondo.hospitality_assignments
CREATE TABLE IF NOT EXISTS `hospitality_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `hospitality_id` bigint(20) unsigned NOT NULL COMMENT 'FK to hospitalities table',
  `sport_type` varchar(100) DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  `sport_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) DEFAULT NULL COMMENT 'Display name for the ticket category',
  `level` enum('sport','tournament','team','event','ticket') NOT NULL COMMENT 'The hierarchy level this assignment targets',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this assignment is currently active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_hospitality_scope` (`hospitality_id`,`sport_type`,`tournament_id`,`team_id`,`event_id`,`ticket_id`),
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
  CONSTRAINT `fk_ha_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ha_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ha_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical hospitality service assignments (sport > tournament > team > event > ticket)';

-- Dumping data for table rondo.hospitality_assignments
INSERT INTO `hospitality_assignments` (`id`, `hospitality_id`, `sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`, `sport_name`, `tournament_name`, `team_name`, `event_name`, `ticket_name`, `level`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
	(32, 1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', 'Executive Lounge', 'ticket', 1, 3, 3, '2026-02-12 17:13:22', '2026-02-12 17:13:22'),
	(33, 2, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', 'Executive Lounge', 'ticket', 1, 3, 3, '2026-02-12 17:13:22', '2026-02-12 17:13:22'),
	(34, 3, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', 'Executive Lounge', 'ticket', 1, 3, 3, '2026-02-12 17:13:22', '2026-02-12 17:13:22'),
	(35, 1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', NULL, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', NULL, 'event', 1, 3, 3, '2026-02-12 17:15:09', '2026-02-12 17:15:09'),
	(36, 2, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', NULL, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', NULL, 'event', 1, 3, 3, '2026-02-12 17:15:09', '2026-02-12 17:15:09'),
	(37, 1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', NULL, NULL, 'Soccer', 'Premier League', 'Manchester United', NULL, NULL, 'team', 1, 3, 3, '2026-02-12 17:15:19', '2026-02-12 17:15:19'),
	(38, 3, 'soccer', 'f306f395644a42e09821253d13637d70_trn', NULL, NULL, NULL, 'Soccer', 'Premier League', NULL, NULL, NULL, 'tournament', 1, 3, 3, '2026-02-12 17:15:33', '2026-02-12 17:15:33'),
	(39, 1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', NULL, NULL, NULL, 'Soccer', 'Premier League', NULL, NULL, NULL, 'tournament', 1, 3, 3, '2026-02-12 17:15:33', '2026-02-12 17:15:33'),
	(40, 3, 'soccer', NULL, NULL, NULL, NULL, 'Soccer', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-12 17:15:41', '2026-02-12 17:15:41');

-- Dumping structure for table rondo.ticket_hospitalities
CREATE TABLE IF NOT EXISTS `ticket_hospitalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(100) NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) NOT NULL COMMENT 'XS2Event ticket ID',
  `hospitality_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to hospitality service',
  `custom_price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Optional custom price override for this ticket',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who created the assignment',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ticket_hospitality` (`event_id`,`ticket_id`,`hospitality_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_hospitality_id` (`hospitality_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_event_ticket` (`event_id`,`ticket_id`),
  CONSTRAINT `fk_ticket_hospitality_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_hospitality_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticket to hospitality service mappings';

-- Dumping data for table rondo.ticket_hospitalities
INSERT INTO `ticket_hospitalities` (`id`, `event_id`, `ticket_id`, `hospitality_id`, `custom_price_usd`, `created_by`, `created_at`) VALUES
	(22, '764dd883de654f60aadf5fe872cadd4a_gnr', '2149bc6a567c44358a0f81108be39ad6_spt', 1, NULL, 3, '2026-01-22 07:09:03'),
	(23, '764dd883de654f60aadf5fe872cadd4a_gnr', '24261217d1c94e15b04b5c0f200bb391_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(24, '764dd883de654f60aadf5fe872cadd4a_gnr', '46b9e58f649c4059a7eb0557be162f5e_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(25, '764dd883de654f60aadf5fe872cadd4a_gnr', '46b9e58f649c4059a7eb0557be162f5e_spp', 2, NULL, 3, '2026-01-22 07:09:03'),
	(26, '764dd883de654f60aadf5fe872cadd4a_gnr', '51960c4d249c4c1dbc7149c326977b5c_spt', 1, NULL, 3, '2026-01-22 07:09:03'),
	(27, '764dd883de654f60aadf5fe872cadd4a_gnr', '599439e0b6d44d28bd859132125bd7d3_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(28, '764dd883de654f60aadf5fe872cadd4a_gnr', '64297d666d774066ae749b494307c76d_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(29, '764dd883de654f60aadf5fe872cadd4a_gnr', '86dc470a8baf42998ca8f887c60f1a35_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(30, '764dd883de654f60aadf5fe872cadd4a_gnr', 'c4d8eba21b964f06bc5b80da69e3b8dc_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(31, '764dd883de654f60aadf5fe872cadd4a_gnr', 'f7fa96ea0263456e8f56f4d02a6af3ff_spp', 1, NULL, 3, '2026-01-22 07:09:03'),
	(32, '9b0856d9aa964f259999212d121ff006_gnr', '1c252f389cd54b38b9d7ecc86dcd8e51_spp', 1, NULL, 3, '2026-01-27 11:27:04'),
	(33, '9b0856d9aa964f259999212d121ff006_gnr', '1c252f389cd54b38b9d7ecc86dcd8e51_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(34, '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(35, '9b0856d9aa964f259999212d121ff006_gnr', 'fac2023dfb03418897d25c706eb97e5b_spt', 1, NULL, 3, '2026-01-27 11:27:04'),
	(36, '9b0856d9aa964f259999212d121ff006_gnr', 'fac2023dfb03418897d25c706eb97e5b_spt', 2, NULL, 3, '2026-01-27 11:27:04'),
	(37, '9b0856d9aa964f259999212d121ff006_gnr', '900a02e84f3344c2adbcc501775fe592_spt', 1, NULL, 3, '2026-01-27 11:27:04'),
	(38, '9b0856d9aa964f259999212d121ff006_gnr', '900a02e84f3344c2adbcc501775fe592_spt', 2, NULL, 3, '2026-01-27 11:27:04'),
	(39, '9b0856d9aa964f259999212d121ff006_gnr', '1695aa67834d4288af0c87dc7814b24f_spp', 1, NULL, 3, '2026-01-27 11:27:04'),
	(40, '9b0856d9aa964f259999212d121ff006_gnr', '1695aa67834d4288af0c87dc7814b24f_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(41, '9b0856d9aa964f259999212d121ff006_gnr', '04187ceeb2c34c2b9449b8162ba8d00c_spp', 1, NULL, 3, '2026-01-27 11:27:04'),
	(42, '9b0856d9aa964f259999212d121ff006_gnr', '929bee1db37343d784cbacbe88b03cd9_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(43, '9b0856d9aa964f259999212d121ff006_gnr', '1b0d65dae9404e90808b4bf48a20d1f7_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(44, '9b0856d9aa964f259999212d121ff006_gnr', '2a26fb42e3e2484890584740989fceec_spp', 1, NULL, 3, '2026-01-27 11:27:04'),
	(45, '9b0856d9aa964f259999212d121ff006_gnr', '2a26fb42e3e2484890584740989fceec_spp', 2, NULL, 3, '2026-01-27 11:27:04'),
	(46, '9b0856d9aa964f259999212d121ff006_gnr', '82537d092c75451492f48ef7177c68e2_spt', 1, NULL, 3, '2026-01-27 11:27:04'),
	(47, '9b0856d9aa964f259999212d121ff006_gnr', '82537d092c75451492f48ef7177c68e2_spt', 2, NULL, 3, '2026-01-27 11:27:04');

-- Dumping structure for table rondo.ticket_markups
CREATE TABLE IF NOT EXISTS `ticket_markups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(100) NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) NOT NULL COMMENT 'XS2Event ticket ID',
  `markup_price_usd` decimal(10,2) NOT NULL COMMENT 'Calculated markup amount in USD (either fixed or calculated from percentage)',
  `markup_type` enum('fixed','percentage') NOT NULL DEFAULT 'fixed' COMMENT 'Type of markup: fixed (USD amount) or percentage (% of base price)',
  `markup_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Markup percentage (0-100%) when markup_type is percentage',
  `base_price_usd` decimal(10,2) NOT NULL COMMENT 'Original ticket price in USD (for reference)',
  `final_price_usd` decimal(10,2) NOT NULL COMMENT 'Base + Markup in USD',
  `created_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who created markup',
  `updated_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Admin user who last updated markup',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_ticket` (`event_id`,`ticket_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  KEY `idx_event_created` (`event_id`,`created_at`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_markup_type` (`markup_type`),
  CONSTRAINT `fk_markup_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_markup_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event ticket markup pricing management';

-- Dumping data for table rondo.ticket_markups (no data currently)

-- Dumping structure for table rondo.booking_hospitalities
CREATE TABLE IF NOT EXISTS `booking_hospitalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to the booking',
  `hospitality_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Reference to the hospitality service',
  `hospitality_name` varchar(255) NOT NULL COMMENT 'Name of hospitality (cached for history)',
  `price_usd` decimal(10,2) NOT NULL COMMENT 'Price at time of booking (USD)',
  `quantity` int(11) NOT NULL DEFAULT 1 COMMENT 'Quantity (usually matches ticket quantity)',
  `total_usd` decimal(10,2) NOT NULL COMMENT 'Total price (price_usd * quantity)',
  `ticket_id` varchar(100) DEFAULT NULL COMMENT 'XS2Event ticket ID this hospitality was for',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_hospitality_id` (`hospitality_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  CONSTRAINT `fk_booking_hospitality_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_hospitality_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services booked with tickets';

-- Dumping data for table rondo.booking_hospitalities
-- NOTE: Only insert booking_hospitalities if the referenced booking exists
-- Uncomment the following line only if booking with id=34 exists in your database
-- INSERT INTO `booking_hospitalities` (`id`, `booking_id`, `hospitality_id`, `hospitality_name`, `price_usd`, `quantity`, `total_usd`, `ticket_id`, `created_at`) VALUES
-- 	(1, 34, 1, 'VIP lounge Access', 100.00, 2, 200.00, 'c4d8eba21b964f06bc5b80da69e3b8dc_spp', '2026-01-27 12:44:02');

-- ========================================================================
-- STEP 5: Restore settings
-- ========================================================================

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
