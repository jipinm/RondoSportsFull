-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.13.0.7147
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table rondo.hospitalities
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services management';

-- Dumping data for table rondo.hospitalities: ~2 rows (approximately)
INSERT INTO `hospitalities` (`id`, `name`, `description`, `price_usd`, `is_active`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
	(1, 'VIP lounge Access', 'You can enter the VIP area.', 100.00, 1, 1, 3, 3, '2026-01-22 06:52:13', '2026-01-22 06:52:29'),
	(2, 'Whole day Food', 'Full meal for the event day', 25.00, 1, 2, 3, 3, '2026-01-22 06:53:19', '2026-01-22 06:53:19');

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

-- Dumping data for table rondo.ticket_hospitalities: ~26 rows (approximately)
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

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
