-- --------------------------------------------------------
-- Migration: Create booking_hospitalities table
-- Description: Stores hospitality services selected for each booking
-- Date: 2026-01-27
-- --------------------------------------------------------

-- Create the booking_hospitalities table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services booked with tickets';

-- Add hospitality_total column to bookings table if it doesn't exist
ALTER TABLE `bookings` 
ADD COLUMN IF NOT EXISTS `hospitality_total` decimal(10,2) DEFAULT 0.00 COMMENT 'Total hospitality charges (USD)' AFTER `total_amount`;
