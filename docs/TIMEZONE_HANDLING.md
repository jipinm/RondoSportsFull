# Timezone Handling Guide

## Problem Statement

The Rondo admin application has timezone inconsistencies when handling banner start/end dates:

1. **Frontend** sends dates as ISO strings in UTC
2. **Backend** converts these to server's local timezone when storing
3. **Database** stores as `DATETIME` without timezone information
4. When retrieved, dates are interpreted in the server's timezone, not the user's timezone

This causes confusion when:
- Admin users set dates from different timezones
- The same admin accesses the system from different locations
- Multiple admins collaborate across different geographic regions

## Solution: Store in UTC, Display in User's Timezone

### Architecture Overview

```
┌─────────────────┐      ISO 8601 (UTC)      ┌─────────────────┐      UTC DATETIME      ┌──────────────┐
│   Admin User    │ ────────────────────────> │   Backend API   │ ──────────────────────> │   Database   │
│ (Local TZ)      │                           │  (Any TZ)       │                         │  (UTC)       │
│                 │ <──────────────────────── │                 │ <────────────────────── │              │
└─────────────────┘      ISO 8601 (UTC)      └─────────────────┘      UTC DATETIME      └──────────────┘
        │                                                                                         │
        │ Converts to                                                                            │
        │ Local TZ for                                                                           │
        │ Display                                                                                │
        └─────────────────────────────────────────────────────────────────────────────────────┘
                                    All storage and transmission in UTC
```

### Key Principles

1. **Single Source of Truth**: All dates stored in UTC in the database
2. **Timezone-Aware Display**: Frontend displays dates in user's browser timezone
3. **Clear Communication**: Timezone information shown next to date fields
4. **ISO 8601 Format**: Use standardized format for date transmission
5. **No Server Timezone Dependency**: Backend doesn't impose its timezone on data

## Implementation Guide

### 1. Database Layer

#### Current Schema
```sql
CREATE TABLE banners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    -- other fields...
);
```

#### Recommended Changes

**Option A: Keep DATETIME, Add Comments**
```sql
ALTER TABLE banners 
    MODIFY COLUMN start_date DATETIME NULL COMMENT 'UTC timezone',
    MODIFY COLUMN end_date DATETIME NULL COMMENT 'UTC timezone';
```

**Option B: Use TIMESTAMP (Alternative)**
```sql
-- TIMESTAMP automatically stores in UTC and converts on retrieval
-- Limited to 1970-2038 range
ALTER TABLE banners 
    MODIFY COLUMN start_date TIMESTAMP NULL,
    MODIFY COLUMN end_date TIMESTAMP NULL;
```

**Recommendation**: Use Option A (DATETIME) for flexibility and wider date range support.

### 2. Backend (PHP/API) Implementation

#### File: `api/src/Service/BannersService.php`

Add UTC conversion helper method:

```php
/**
 * Convert date string to UTC format for database storage
 * 
 * @param string $dateString Date in ISO 8601 format or server timezone
 * @return string Date in UTC format (Y-m-d H:i:s)
 */
private function convertToUTC(string $dateString): string
{
    try {
        // If already in UTC format (ends with Z or +00:00), parse as UTC
        if (str_ends_with($dateString, 'Z') || str_ends_with($dateString, '+00:00')) {
            $date = new \DateTime($dateString, new \DateTimeZone('UTC'));
        } else {
            // If no timezone info, assume server timezone and convert to UTC
            $date = new \DateTime($dateString, new \DateTimeZone(date_default_timezone_get()));
            $date->setTimezone(new \DateTimeZone('UTC'));
        }
        
        return $date->format('Y-m-d H:i:s');
    } catch (\Exception $e) {
        $this->logger->error('Date conversion error', [
            'date' => $dateString,
            'error' => $e->getMessage()
        ]);
        // Return original string if conversion fails
        return $dateString;
    }
}

/**
 * Convert UTC date from database to ISO 8601 format with UTC indicator
 * 
 * @param string|null $utcDateString Date from database in Y-m-d H:i:s format
 * @return string|null ISO 8601 format with Z suffix
 */
private function formatDateForResponse(?string $utcDateString): ?string
{
    if (empty($utcDateString)) {
        return null;
    }
    
    try {
        $date = new \DateTime($utcDateString, new \DateTimeZone('UTC'));
        return $date->format('Y-m-d\TH:i:s.v\Z'); // ISO 8601 with milliseconds and Z
    } catch (\Exception $e) {
        $this->logger->error('Date formatting error', [
            'date' => $utcDateString,
            'error' => $e->getMessage()
        ]);
        return $utcDateString;
    }
}
```

Update `createBanner` method:

```php
public function createBanner(array $data, int $adminUserId): array
{
    try {
        // ... existing validation ...

        // Convert dates to UTC before storage
        if (!empty($data['start_date'])) {
            $data['start_date'] = $this->convertToUTC($data['start_date']);
        }
        
        if (!empty($data['end_date'])) {
            $data['end_date'] = $this->convertToUTC($data['end_date']);
        }

        // ... rest of method ...
    }
}
```

Update `updateBanner` method:

```php
public function updateBanner(int $id, array $data, int $adminUserId): array
{
    try {
        // ... existing code ...

        // Convert dates to UTC before storage
        if (array_key_exists('start_date', $data) && !empty($data['start_date'])) {
            $data['start_date'] = $this->convertToUTC($data['start_date']);
        }
        
        if (array_key_exists('end_date', $data) && !empty($data['end_date'])) {
            $data['end_date'] = $this->convertToUTC($data['end_date']);
        }

        // ... rest of method ...
    }
}
```

Update response formatting in `getBanners` and `getBannerById`:

```php
public function getBanners(array $filters = []): array
{
    $banners = $this->repository->getBanners($filters);
    
    // Format dates for response
    foreach ($banners as &$banner) {
        $banner['start_date'] = $this->formatDateForResponse($banner['start_date']);
        $banner['end_date'] = $this->formatDateForResponse($banner['end_date']);
    }
    
    return [
        'success' => true,
        'data' => $banners
    ];
}
```

### 3. Frontend (React/TypeScript) Implementation

#### File: `admin/src/components/banners/BannerForm.tsx`

```tsx
import React, { useState, useEffect } from 'react';

interface BannerFormProps {
  banner?: Banner | null;
  onSubmit: (data: BannerFormData) => void;
  onCancel: () => void;
}

export const BannerForm: React.FC<BannerFormProps> = ({
  banner,
  onSubmit,
  onCancel,
}) => {
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [timezoneOffset, setTimezoneOffset] = useState<string>('');
  const [formData, setFormData] = useState<BannerFormData>({
    title: banner?.title || '',
    start_date: banner?.start_date || null,
    end_date: banner?.end_date || null,
    // ... other fields
  });

  useEffect(() => {
    // Detect user's timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
    
    // Get timezone offset for display (e.g., "UTC+4")
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? '+' : '-';
    setTimezoneOffset(`UTC${sign}${hours}${minutes > 0 ? ':' + minutes : ''}`);
  }, []);

  /**
   * Convert UTC ISO string to local datetime string for input field
   * Input: "2025-12-17T10:00:00.000Z" (UTC)
   * Output: "2025-12-17T14:00" (Local, for datetime-local input)
   */
  const utcToLocalInput = (utcDateString: string | null): string => {
    if (!utcDateString) return '';
    
    try {
      const date = new Date(utcDateString);
      
      // Format for datetime-local input: YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error converting UTC to local:', error);
      return '';
    }
  };

  /**
   * Convert local datetime input value to UTC ISO string for API
   * Input: "2025-12-17T14:00" (Local input value)
   * Output: "2025-12-17T10:00:00.000Z" (UTC ISO string)
   */
  const localInputToUtc = (localDateString: string): string | null => {
    if (!localDateString) return null;
    
    try {
      // datetime-local gives us local time without timezone info
      // Create a Date object which will be in local timezone
      const date = new Date(localDateString);
      
      // Convert to ISO string (automatically converts to UTC and adds Z)
      return date.toISOString();
    } catch (error) {
      console.error('Error converting local to UTC:', error);
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert local dates to UTC before sending to API
    const submitData = {
      ...formData,
      start_date: localInputToUtc(formData.start_date),
      end_date: localInputToUtc(formData.end_date),
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* ... other fields ... */}

      <div className={styles.formGroup}>
        <label htmlFor="start_date" className={styles.label}>
          Start Date & Time
          <span className={styles.timezoneHint}>
            ({timezoneOffset} - {userTimezone})
          </span>
        </label>
        <input
          type="datetime-local"
          id="start_date"
          name="start_date"
          value={utcToLocalInput(formData.start_date)}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className={styles.input}
        />
        <small className={styles.helpText}>
          📅 Select date and time in your local timezone. It will be stored as UTC.
        </small>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="end_date" className={styles.label}>
          End Date & Time
          <span className={styles.timezoneHint}>
            ({timezoneOffset} - {userTimezone})
          </span>
        </label>
        <input
          type="datetime-local"
          id="end_date"
          name="end_date"
          value={utcToLocalInput(formData.end_date)}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          className={styles.input}
        />
        <small className={styles.helpText}>
          📅 Select date and time in your local timezone. It will be stored as UTC.
        </small>
      </div>

      {/* ... buttons ... */}
    </form>
  );
};
```

#### Add Styles: `admin/src/components/banners/BannerForm.module.css`

```css
.timezoneHint {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary);
  font-family: monospace;
}

.helpText {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
```

#### Update Banner List Display: `admin/src/components/banners/BannerList.tsx`

```tsx
/**
 * Format UTC date for display in user's local timezone
 */
const formatDateForDisplay = (utcDateString: string | null): string => {
  if (!utcDateString) return 'Not set';
  
  try {
    const date = new Date(utcDateString);
    
    // Format: "Dec 17, 2025, 2:00 PM"
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// In the component:
<td>{formatDateForDisplay(banner.start_date)}</td>
<td>{formatDateForDisplay(banner.end_date)}</td>
```

### 4. Testing Checklist

#### Unit Tests

- [ ] Backend UTC conversion with various input formats
- [ ] Frontend local-to-UTC conversion
- [ ] Frontend UTC-to-local conversion
- [ ] Edge cases: null dates, invalid formats, leap years

#### Integration Tests

- [ ] Create banner with dates in different timezones
- [ ] Update banner dates
- [ ] Retrieve banner and verify dates display correctly
- [ ] Verify banner activation based on UTC times

#### Manual Testing

**Test Case 1: Create Banner from Different Timezones**
1. Admin in UAE (UTC+4) creates banner: Start: Dec 17, 2025, 2:00 PM local
2. Verify database stores: 2025-12-17 10:00:00 (UTC)
3. Admin in USA (UTC-5) views same banner
4. Verify displays: Dec 17, 2025, 5:00 AM local

**Test Case 2: Daylight Saving Time**
1. Create banner during DST period
2. View banner after DST ends
3. Verify times remain consistent in UTC

**Test Case 3: Banner Activation**
1. Create banner with start_date in future (UTC)
2. Verify banner becomes active at exact UTC time
3. Verify all users see activation at correct local time

### 5. Migration Strategy

#### One-Time Data Migration Script

```php
<?php
// File: api/bin/migrate-dates-to-utc.php

require_once __DIR__ . '/../vendor/autoload.php';

use Rondo\Config\Database;

$db = new Database();
$pdo = $db->getConnection();

// Get server's timezone
$serverTimezone = date_default_timezone_get();
echo "Server timezone: $serverTimezone\n";
echo "Converting existing banner dates to UTC...\n\n";

try {
    $pdo->beginTransaction();
    
    // Get all banners with dates
    $stmt = $pdo->query("
        SELECT id, start_date, end_date 
        FROM banners 
        WHERE start_date IS NOT NULL OR end_date IS NOT NULL
    ");
    
    $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($banners) . " banners with dates\n";
    
    $updateStmt = $pdo->prepare("
        UPDATE banners 
        SET start_date = ?, end_date = ? 
        WHERE id = ?
    ");
    
    foreach ($banners as $banner) {
        echo "\nBanner ID: {$banner['id']}\n";
        
        $startUtc = null;
        $endUtc = null;
        
        if ($banner['start_date']) {
            $date = new DateTime($banner['start_date'], new DateTimeZone($serverTimezone));
            $date->setTimezone(new DateTimeZone('UTC'));
            $startUtc = $date->format('Y-m-d H:i:s');
            echo "  Start: {$banner['start_date']} ($serverTimezone) -> $startUtc (UTC)\n";
        }
        
        if ($banner['end_date']) {
            $date = new DateTime($banner['end_date'], new DateTimeZone($serverTimezone));
            $date->setTimezone(new DateTimeZone('UTC'));
            $endUtc = $date->format('Y-m-d H:i:s');
            echo "  End: {$banner['end_date']} ($serverTimezone) -> $endUtc (UTC)\n";
        }
        
        $updateStmt->execute([$startUtc, $endUtc, $banner['id']]);
    }
    
    $pdo->commit();
    echo "\n✅ Migration completed successfully!\n";
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
```

Run migration:
```bash
cd /path/to/api
php bin/migrate-dates-to-utc.php
```

#### Deployment Steps

1. **Backup Database**
   ```bash
   mysqldump -u user -p database_name > backup_before_timezone_fix.sql
   ```

2. **Deploy Backend Changes**
   - Update BannersService.php with UTC conversion methods
   - Test API endpoints with Postman

3. **Run Migration Script**
   - Convert existing dates to UTC
   - Verify data in database

4. **Deploy Frontend Changes**
   - Update BannerForm.tsx and BannerList.tsx
   - Clear browser cache for all admins

5. **Verify**
   - Create test banner
   - Check database shows UTC
   - View from different timezone (use VPN or browser DevTools)

### 6. Troubleshooting

#### Issue: Dates appear 4-5 hours off

**Cause**: Server timezone interfering with conversion

**Solution**: Ensure backend always converts to UTC before storage
```php
$date = new DateTime($dateString, new DateTimeZone('UTC'));
```

#### Issue: Timezone shown as "Etc/Unknown"

**Cause**: Browser timezone not detected

**Solution**: Fallback to UTC display
```tsx
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
```

#### Issue: Datetime-local input shows wrong time

**Cause**: Not converting UTC to local for display

**Solution**: Always convert server dates to local before populating input
```tsx
value={utcToLocalInput(formData.start_date)}
```

## Best Practices

### DO ✅

- Store all dates in UTC in the database
- Use ISO 8601 format with 'Z' suffix for API responses
- Display timezone information next to date inputs
- Use `datetime-local` input type for better UX
- Test with users in multiple timezones
- Document timezone handling in API documentation

### DON'T ❌

- Mix timezone-aware and timezone-naive dates
- Rely on server timezone for business logic
- Store dates with timezone offsets in DATETIME fields
- Forget to convert when displaying to users
- Assume all users are in the same timezone
- Use ambiguous date formats (MM/DD/YYYY vs DD/MM/YYYY)

## Additional Enhancements

### 1. Admin Timezone Preference

Allow admins to set preferred timezone in settings:

```sql
ALTER TABLE admin_users 
    ADD COLUMN preferred_timezone VARCHAR(50) DEFAULT 'UTC';
```

### 2. Timezone Selector in Form

```tsx
<select 
  value={selectedTimezone} 
  onChange={(e) => setSelectedTimezone(e.target.value)}
>
  <option value="auto">🌍 Auto-detect ({userTimezone})</option>
  <option value="UTC">UTC (Coordinated Universal Time)</option>
  <option value="Asia/Dubai">Asia/Dubai (UAE Time)</option>
  <option value="America/New_York">America/New_York (EST/EDT)</option>
  <option value="Europe/London">Europe/London (GMT/BST)</option>
  {/* ... more timezones */}
</select>
```

### 3. Relative Time Display

```tsx
import { formatDistanceToNow } from 'date-fns';

const getRelativeTime = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

// Display: "Starts in 2 hours" or "Started 3 days ago"
```

## References

- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)
- [PHP DateTime Documentation](https://www.php.net/manual/en/class.datetime.php)
- [JavaScript Date Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MySQL DATETIME vs TIMESTAMP](https://dev.mysql.com/doc/refman/8.0/en/datetime.html)
- [Moment Timezone Database](https://momentjs.com/timezone/)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-17 | Initial documentation |

---

**Maintained by**: Rondo Development Team  
**Last Updated**: December 17, 2025
