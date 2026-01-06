# Frontend Banner Display - Timezone Fix

## Issue Identified

The frontend application (public-facing website) was not correctly displaying banners based on UTC dates because the backend query used `NOW()` instead of `UTC_TIMESTAMP()`.

### Problem

**File**: `api/src/Repository/BannersRepository.php` - `findByLocation()` method

**Previous Implementation**:
```php
WHERE location = :location 
    AND (
        (status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()))
        OR
        (status = 'scheduled' AND start_date <= NOW() AND end_date >= NOW())
    )
```

**Issue**: 
- `NOW()` returns the server's current timestamp in the **server's timezone** (e.g., Asia/Dubai UTC+4)
- Banner dates are stored in **UTC** after our timezone implementation
- This causes incorrect banner visibility based on 4-5 hour offset

### Example Scenario

**Banner Configuration:**
- Start Date: 2025-12-17 10:00:00 (UTC)
- End Date: 2025-12-17 18:00:00 (UTC)
- Expected Display: 2:00 PM - 10:00 PM Dubai Time (UTC+4)

**Server in Dubai (UTC+4):**
- Server time: 2025-12-17 13:00:00 (Asia/Dubai)
- `NOW()` returns: 2025-12-17 13:00:00
- Comparison: 13:00:00 vs 10:00:00 (UTC) ❌ **Incorrect comparison**
- Result: Banner appears 4 hours early/late

## Solution Implemented

### Updated Implementation

**File**: `api/src/Repository/BannersRepository.php`

```php
/**
 * Get banners by location for public display
 * Uses UTC_TIMESTAMP() to compare with UTC dates in database
 */
public function findByLocation(string $location, int $limit = 10): array
{
    try {
        $sql = "
            SELECT 
                id, title, description, image_url, mobile_image_url, 
                link_url, link_target, position_order, price_tag
            FROM banners 
            WHERE location = :location 
                AND (
                    (status = 'active' AND (start_date IS NULL OR start_date <= UTC_TIMESTAMP()) AND (end_date IS NULL OR end_date >= UTC_TIMESTAMP()))
                    OR
                    (status = 'scheduled' AND start_date <= UTC_TIMESTAMP() AND end_date >= UTC_TIMESTAMP())
                )
            ORDER BY position_order ASC, id ASC
            LIMIT :limit
        ";
        // ... rest of method
    }
}
```

**Changes Made:**
- ✅ Replaced `NOW()` with `UTC_TIMESTAMP()` (3 occurrences)
- ✅ Added documentation explaining UTC usage
- ✅ Ensures banner visibility is consistent regardless of server timezone

### How It Works Now

**Same Banner Configuration:**
- Start Date: 2025-12-17 10:00:00 (UTC)
- End Date: 2025-12-17 18:00:00 (UTC)

**Server in Dubai (UTC+4):**
- Server time: 2025-12-17 13:00:00 (Asia/Dubai)
- `UTC_TIMESTAMP()` returns: 2025-12-17 09:00:00 (UTC)
- Comparison: 09:00:00 vs 10:00:00 (UTC) ✅ **Correct comparison**
- Result: Banner displays at correct UTC times

## Frontend Implementation Review

### Current Frontend Code

**File**: `frontend/src/types/banners.ts`
```typescript
export interface Banner {
  id: number;
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  link_target: '_self' | '_blank' | null;
  position_order: number;
  price_tag: string | null;
  // NOTE: No date fields in frontend - dates handled server-side
}
```

**File**: `frontend/src/services/bannersService.ts`
```typescript
async getBannersByLocation(location: string, limit: number = 10): Promise<Banner[]> {
  try {
    const response = await customerApiClient.get<BannersResponse>(
      `/api/v1/banners/${location}?limit=${limit}`
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.error('Failed to fetch banners:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching banners:', error.message);
    return [];
  }
}
```

**File**: `frontend/src/components/home/Hero.tsx`
```typescript
// Fetches homepage hero banners
const fetchBanners = async () => {
  try {
    setLoading(true);
    const data = await bannersService.getHomepageHeroBanners();
    
    if (data.length === 0) {
      setError('No banners available at this time');
    } else {
      setBanners(data);
    }
  } catch (err: any) {
    console.error('Failed to fetch banners:', err);
    setError('Failed to load banners');
  } finally {
    setLoading(false);
  }
};
```

### Analysis

✅ **Frontend Implementation is Correct:**
1. Frontend doesn't need to know about dates - server handles all date logic
2. API endpoint (`/api/v1/banners/{location}`) returns only **active banners** based on UTC time
3. Frontend simply displays whatever banners the backend returns
4. No timezone conversion needed on frontend since dates aren't displayed

✅ **Banner Types:**
```typescript
// Frontend banner interface doesn't include dates
interface Banner {
  id, title, description, image_url, mobile_image_url,
  link_url, link_target, position_order, price_tag
}
```

This is correct because:
- Start/end dates are for **scheduling**, not display
- Backend determines if banner should be shown
- Frontend only shows active banners

## Testing Checklist

### Backend Testing

**Test 1: UTC Comparison**
```sql
-- Set server timezone to something other than UTC
SET time_zone = '+04:00';

-- Get current time in both timezones
SELECT NOW() as server_time, UTC_TIMESTAMP() as utc_time;
-- Example output:
-- server_time: 2025-12-17 14:00:00
-- utc_time:    2025-12-17 10:00:00

-- Test banner query with UTC
SELECT id, title, start_date, end_date, status
FROM banners
WHERE location = 'homepage_hero'
  AND (start_date IS NULL OR start_date <= UTC_TIMESTAMP())
  AND (end_date IS NULL OR end_date >= UTC_TIMESTAMP());
```

**Test 2: Active Banner Display**
```bash
# Create a test banner with specific UTC times
curl -X POST http://localhost:8000/api/v1/admin/banners \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Banner",
    "start_date": "2025-12-17T10:00:00.000Z",
    "end_date": "2025-12-17T18:00:00.000Z",
    "location": "homepage_hero",
    "status": "active"
  }'

# Check if banner appears (during UTC hours 10:00-18:00)
curl http://localhost:8000/api/v1/banners/homepage_hero
```

### Frontend Testing

**Test 3: Hero Banner Display**
1. Open frontend: http://localhost:5173
2. Banner should appear if current UTC time is within start_date/end_date
3. Check browser console for any errors

**Test 4: Banner Auto-Update**
1. Create banner with start time in 2 minutes (UTC)
2. Refresh page before start time → no banner
3. Wait until start time passes
4. Refresh page → banner should appear

**Test 5: Banner Expiry**
1. Create banner with end time in 2 minutes (UTC)
2. Banner should display
3. Wait until end time passes
4. Refresh page → banner should disappear

## Deployment Steps

### 1. Verify Current State

```bash
# Check if timezone implementation is already deployed
cd e:\Rondo-Development\api
grep -n "UTC_TIMESTAMP" src/Repository/BannersRepository.php

# Should show the updated findByLocation method
```

### 2. No Frontend Changes Needed

Frontend code is already correct - no changes required.

### 3. Test the Fix

```bash
# Start backend (if not running)
cd e:\Rondo-Development\api
php -S localhost:8000 -t public

# Start frontend (if not running)
cd e:\Rondo-Development\frontend
npm run dev
```

### 4. Verify Banner Display

1. Check admin panel: http://localhost:3000
2. View/create banners with specific UTC times
3. Check frontend: http://localhost:5173
4. Verify banners appear/disappear at correct UTC times

## Summary

### Changes Made

| File | Method | Change | Reason |
|------|--------|--------|--------|
| `api/src/Repository/BannersRepository.php` | `findByLocation()` | `NOW()` → `UTC_TIMESTAMP()` | Compare UTC dates with UTC time |

### Impact

✅ **Positive:**
- Banners now display at correct times globally
- No timezone offset issues
- Consistent behavior regardless of server location
- Frontend already correctly implemented

⚠️ **Important:**
- Requires banner dates to be stored in UTC (already done via earlier implementation)
- If migration script hasn't been run, existing banners may have incorrect dates

### Related Documentation

- [TIMEZONE_HANDLING.md](./TIMEZONE_HANDLING.md) - Complete timezone implementation guide
- [DEPLOYMENT_TIMEZONE_FIX.md](./DEPLOYMENT_TIMEZONE_FIX.md) - Deployment steps for admin panel

---

**Fixed by**: Rondo Development Team  
**Date**: December 17, 2025  
**Status**: ✅ Complete - Ready for Testing
