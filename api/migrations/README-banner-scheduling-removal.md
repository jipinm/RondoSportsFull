# Banner Scheduling Functionality Removal - Migration Guide

**Date:** December 20, 2025  
**Author:** System Update  
**Type:** Database Schema Change & API Update

## Overview

This migration removes the banner scheduling functionality from the Rondo application. The changes replace the time-based scheduling system (start_date/end_date with time) with a simple event date field (date-only) for display purposes.

## Changes Summary

### Database Changes
- **Removed Fields:** `start_date` (TIMESTAMP), `end_date` (TIMESTAMP)
- **Added Field:** `event_date` (DATE)
- **Status Update:** Removed `'scheduled'` from status ENUM, keeping only `'active'` and `'inactive'`
- **Index Changes:** Dropped `idx_dates`, added `idx_event_date`

### API Changes

#### 1. **BannersController.php**
- Removed `start_date` and `end_date` from accepted filter parameters
- Filters now only accept: `search`, `status`, `location`

#### 2. **BannersRepository.php**
- Updated `create()` method to use `event_date` instead of `start_date`/`end_date`
- Updated `update()` method to use `event_date` instead of `start_date`/`end_date`
- Updated `findByLocation()` to remove date-range filtering logic
- Removed scheduled status checks from public banner queries
- Added `event_date` to public banner SELECT fields

#### 3. **BannersService.php**
- Removed `convertToUTC()` method (no longer needed for date conversion)
- Added `formatDateOnlyForResponse()` method for date-only formatting
- Updated `getAllBanners()` to format `event_date` instead of `start_date`/`end_date`
- Updated `getBannerById()` to format `event_date` instead of `start_date`/`end_date`
- Removed date conversion logic from `createBanner()` and `updateBanner()`
- Updated validation to accept only `'active'` and `'inactive'` status values
- Replaced `isValidDateTime()` with `isValidDate()` for date-only validation
- Updated validation to check `event_date` instead of date ranges

## Migration Steps

### Step 1: Backup Database
```sql
-- Create backup before migration
mysqldump -u username -p rondo > rondo_backup_before_banner_migration_$(date +%Y%m%d).sql
```

### Step 2: Run Migration Script
```sql
-- Execute the migration file
mysql -u username -p rondo < api/migrations/remove-banner-scheduling.sql
```

### Step 3: Verify Database Changes
```sql
-- Verify the banners table structure
SHOW CREATE TABLE banners;

-- Check that scheduled banners were converted to inactive
SELECT id, title, status, event_date FROM banners WHERE status = 'inactive';

-- Verify event_date data was migrated
SELECT id, title, event_date FROM banners WHERE event_date IS NOT NULL;
```

### Step 4: Deploy API Changes
```bash
# Pull latest code changes
cd /var/www/api
git pull origin main

# Clear any PHP opcache if needed
sudo service php-fpm restart
```

### Step 5: Deploy Frontend Changes
```bash
# Deploy admin panel
cd /path/to/admin
npm run build
# Deploy built files to production

# Deploy frontend
cd /path/to/frontend
npm run build
# Deploy built files to production
```

## Data Migration Details

### Existing Data Handling
- Banners with `start_date` → `event_date` will be set to the date portion of `start_date`
- Banners with `status = 'scheduled'` → Changed to `status = 'inactive'`
- Time information from original timestamps is discarded

### Example Data Transformation
```
Before:
- start_date: 2025-12-16 16:16:00
- end_date: 2025-12-17 16:14:00
- status: scheduled

After:
- event_date: 2025-12-16
- status: inactive
```

## API Response Changes

### Before
```json
{
  "id": 5,
  "title": "UEFA Champions League",
  "status": "scheduled",
  "start_date": "2025-12-17T15:07:00.000Z",
  "end_date": "2026-01-22T10:01:00.000Z"
}
```

### After
```json
{
  "id": 5,
  "title": "UEFA Champions League",
  "status": "inactive",
  "event_date": "2025-12-17"
}
```

## Frontend Changes

### Date Picker
- Changed from `datetime-local` input type to `date` input type
- Removed time selection capability
- Added formatted date display: "Saturday, December 20th"

### Banner Status
- Removed "Scheduled" status option from dropdowns
- Status options now only include: "Active" and "Inactive"

### Banner Display
- Removed scheduling information display
- Added event date display in format: "Saturday, December 20th"
- Event date shown only when a date value exists

## Rollback Plan

If issues arise, you can rollback using these steps:

### 1. Restore Database Backup
```sql
mysql -u username -p rondo < rondo_backup_before_banner_migration_YYYYMMDD.sql
```

### 2. Revert Code Changes
```bash
git revert <commit-hash>
git push origin main
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] No SQL errors in application logs
- [ ] Admin panel can create new banners with event dates
- [ ] Admin panel can edit existing banners
- [ ] Event date displays correctly in format "Saturday, December 20th"
- [ ] Status dropdown shows only "Active" and "Inactive"
- [ ] Public API returns banners with event_date field
- [ ] No references to start_date/end_date in API responses
- [ ] Banner filtering still works correctly
- [ ] Banner reordering still works correctly

## Notes

- The event_date field is optional and used for display purposes only
- Banners no longer automatically activate/deactivate based on dates
- All banner visibility is now controlled solely by the status field ('active' or 'inactive')
- The price_tag field remains unchanged and continues to function as before

## Support

For issues or questions regarding this migration, please contact the development team.
