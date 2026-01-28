
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

-- Dumping data for table rondo.ticket_markups: ~10 rows (approximately)
INSERT INTO `ticket_markups` (`id`, `event_id`, `ticket_id`, `markup_price_usd`, `markup_type`, `markup_percentage`, `base_price_usd`, `final_price_usd`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
	(1, '764dd883de654f60aadf5fe872cadd4a_gnr', '2149bc6a567c44358a0f81108be39ad6_spt', 48.02, 'percentage', 10.00, 480.17, 528.19, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(3, '764dd883de654f60aadf5fe872cadd4a_gnr', '51960c4d249c4c1dbc7149c326977b5c_spt', 87.92, 'percentage', 10.00, 879.19, 967.11, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(4, '764dd883de654f60aadf5fe872cadd4a_gnr', 'f7fa96ea0263456e8f56f4d02a6af3ff_spp', 111.32, 'percentage', 10.00, 1113.19, 1224.51, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(5, '764dd883de654f60aadf5fe872cadd4a_gnr', '599439e0b6d44d28bd859132125bd7d3_spp', 111.32, 'percentage', 10.00, 1113.19, 1224.51, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(6, '764dd883de654f60aadf5fe872cadd4a_gnr', '46b9e58f649c4059a7eb0557be162f5e_spp', 74.66, 'percentage', 10.00, 746.64, 821.30, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(7, '764dd883de654f60aadf5fe872cadd4a_gnr', '24261217d1c94e15b04b5c0f200bb391_spp', 59.65, 'percentage', 10.00, 596.50, 656.15, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(8, '764dd883de654f60aadf5fe872cadd4a_gnr', '86dc470a8baf42998ca8f887c60f1a35_spp', 56.81, 'percentage', 10.00, 568.09, 624.90, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(9, '764dd883de654f60aadf5fe872cadd4a_gnr', '64297d666d774066ae749b494307c76d_spp', 117.68, 'percentage', 10.00, 1176.76, 1294.44, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(10, '764dd883de654f60aadf5fe872cadd4a_gnr', 'ac9e6ad361cd483f86db316ac0cf9375_spt', 68.44, 'percentage', 10.00, 684.42, 752.86, 3, 3, '2026-01-19 11:59:29', '2026-01-26 06:00:02'),
	(12, '764dd883de654f60aadf5fe872cadd4a_gnr', 'c4d8eba21b964f06bc5b80da69e3b8dc_spp', 53.29, 'percentage', 10.00, 532.92, 586.22, 3, 3, '2026-01-20 07:22:25', '2026-01-26 06:00:02'),
	(31, '9b0856d9aa964f259999212d121ff006_gnr', '1c252f389cd54b38b9d7ecc86dcd8e51_spp', 35.00, 'fixed', NULL, 200.03, 235.03, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(32, '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 35.00, 'fixed', NULL, 442.67, 477.67, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(33, '9b0856d9aa964f259999212d121ff006_gnr', 'fac2023dfb03418897d25c706eb97e5b_spt', 35.00, 'fixed', NULL, 165.70, 200.70, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(34, '9b0856d9aa964f259999212d121ff006_gnr', '900a02e84f3344c2adbcc501775fe592_spt', 35.00, 'fixed', NULL, 414.26, 449.26, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(35, '9b0856d9aa964f259999212d121ff006_gnr', '1695aa67834d4288af0c87dc7814b24f_spp', 35.00, 'fixed', NULL, 472.26, 507.26, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(36, '9b0856d9aa964f259999212d121ff006_gnr', '04187ceeb2c34c2b9449b8162ba8d00c_spp', 35.00, 'fixed', NULL, 681.75, 716.75, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(37, '9b0856d9aa964f259999212d121ff006_gnr', '929bee1db37343d784cbacbe88b03cd9_spp', 35.00, 'fixed', NULL, 319.57, 354.57, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(38, '9b0856d9aa964f259999212d121ff006_gnr', '1b0d65dae9404e90808b4bf48a20d1f7_spp', 35.00, 'fixed', NULL, 260.39, 295.39, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(39, '9b0856d9aa964f259999212d121ff006_gnr', '2a26fb42e3e2484890584740989fceec_spp', 35.00, 'fixed', NULL, 391.77, 426.77, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31'),
	(40, '9b0856d9aa964f259999212d121ff006_gnr', '82537d092c75451492f48ef7177c68e2_spt', 35.00, 'fixed', NULL, 249.74, 284.74, 3, 3, '2026-01-27 04:23:31', '2026-01-27 04:23:31');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
