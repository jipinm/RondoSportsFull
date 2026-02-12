# Safe Migration Guide

## Overview
This migration script (`migration-tables-safe.sql`) handles foreign key constraints properly by dropping and recreating tables in the correct dependency order.

## What This Migration Does

### Tables Included:
1. **currencies** - Currency management
2. **hospitalities** - Hospitality services (parent table)
3. **hospitality_assignments** - 5-level hierarchical assignments
4. **ticket_hospitalities** - Legacy ticket-to-hospitality mappings
5. **markup_rules** - Hierarchical pricing markup rules
6. **ticket_markups** - Event ticket markup pricing
7. **booking_hospitalities** - Historical booking records (references hospitalities)

### Migration Order:
1. **Disable foreign key checks** (automatically)
2. **Drop child tables first** (tables with foreign keys):
   - `booking_hospitalities`
   - `hospitality_assignments`
   - `ticket_hospitalities`
   - `ticket_markups`
   - `markup_rules`
3. **Drop parent tables**:
   - `hospitalities`
   - `currencies`
4. **Create parent tables** (with seed data)
5. **Create child tables** (with foreign key constraints and seed data)
6. **Re-enable foreign key checks** (automatically)

## How to Use

### Method 1: MySQL Command Line
```bash
mysql -u your_username -p your_database_name < migration-tables-safe.sql
```

### Method 2: MySQL Workbench
1. Open MySQL Workbench
2. File → Open SQL Script
3. Select `migration-tables-safe.sql`
4. Execute the script (lightning bolt icon)

### Method 3: phpMyAdmin
1. Login to phpMyAdmin
2. Select your database
3. Click "Import" tab
4. Choose file `migration-tables-safe.sql`
5. Click "Go"

### Method 4: HeidiSQL
1. Open HeidiSQL and connect to your database
2. File → Load SQL file
3. Select `migration-tables-safe.sql`
4. Click Execute (F9)

## Safety Features

✅ **Foreign Key Checks Disabled** - Prevents constraint errors during migration  
✅ **DROP IF EXISTS** - Safe to run multiple times without errors  
✅ **Correct Dependency Order** - Child tables dropped before parent tables  
✅ **Complete Data Migration** - Includes all existing data  
✅ **Auto-restore Settings** - Database settings restored after migration  

## Important Notes

⚠️ **Backup First**: Always backup your database before running migrations  
⚠️ **Review Data**: Check that all seed data matches your requirements  
⚠️ **Test Environment**: Test in development before running in production  
⚠️ **Admin Users**: Ensure `admin_users` table exists (referenced by foreign keys)  
⚠️ **Bookings Table**: Ensure `bookings` table exists (referenced by `booking_hospitalities`)  

## Rollback Strategy

If you need to rollback:
1. Restore from your backup
2. Or run the reverse migration (contact your DBA)

## Troubleshooting

### Error: "Unknown table 'admin_users'"
**Solution**: The `admin_users` table is required. Ensure it exists before running this migration.

### Error: "Unknown table 'bookings'"
**Solution**: The `bookings` table is required for `booking_hospitalities`. Ensure it exists first.

### Error: "Duplicate entry"
**Solution**: The script uses `DROP TABLE IF EXISTS`. If you still get duplicates, there may be unique constraint violations in your seed data.

### Foreign Key Constraint Errors
**Solution**: This migration properly handles FK constraints. If you still get errors, ensure:
- Parent tables (`admin_users`, `bookings`) exist
- Foreign key checks are properly disabled (the script does this)

## Verification After Migration

Run these queries to verify the migration was successful:

```sql
-- Check tables were created
SHOW TABLES LIKE '%currencies%';
SHOW TABLES LIKE '%hospitalities%';
SHOW TABLES LIKE '%markup%';

-- Verify data was inserted
SELECT COUNT(*) FROM currencies;
SELECT COUNT(*) FROM hospitalities;
SELECT COUNT(*) FROM hospitality_assignments;
SELECT COUNT(*) FROM markup_rules;

-- Check foreign key constraints
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'rondo'
AND REFERENCED_TABLE_NAME IN ('hospitalities', 'admin_users', 'bookings');
```

## Support

If you encounter any issues with this migration, please check:
1. Database server version compatibility (MariaDB 10.4+ or MySQL 5.7+)
2. User permissions (CREATE, DROP, INSERT privileges required)
3. Database character set (UTF8MB4 recommended)

---
**Last Updated**: February 13, 2026  
**Migration Version**: 1.0  
**Compatible with**: MariaDB 10.4+, MySQL 5.7+
