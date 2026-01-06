# Timezone-Based Banner Visibility Specification

## Objective

Ensure that a banner becomes visible to all users worldwide at the **same absolute moment in time**, regardless of:

* The admin’s local timezone when configuring the banner
* The user’s local timezone when accessing the application

This is achieved by using **UTC as the canonical time reference**.

---

## Core Principle

* Admin selects a **local date & time**
* System converts this datetime to **UTC**
* Only the **UTC timestamp** is stored in the database
* Banner visibility is determined by comparing the **current UTC time** with the stored UTC timestamp

> Result: The banner activates globally at the same instant.

---

## Example 1 – Admin in India (IST)

**Admin Location:** India (IST, UTC +5:30)

**Admin Sets Banner Time:**
17-12-2025 10:00 AM IST

**Stored in Database (UTC):**
17-12-2025 04:30 AM UTC

### User Access Times

| User Location  | Banner Becomes Visible At |
| -------------- | ------------------------- |
| India (IST)    | 17-12-2025 10:00 AM       |
| UAE (UTC+4)    | 17-12-2025 08:30 AM       |
| London (UTC+0) | 17-12-2025 04:30 AM       |

---

## Example 2 – Admin in USA (EST)

**Admin Location:** USA (EST, UTC −5)

**Admin Sets Banner Time:**
17-12-2025 08:00 PM EST

**Stored in Database (UTC):**
18-12-2025 01:00 AM UTC

### User Access Times

| User Location  | Banner Becomes Visible At |
| -------------- | ------------------------- |
| USA (EST)      | 17-12-2025 08:00 PM       |
| India (IST)    | 18-12-2025 06:30 AM       |
| UAE (UTC+4)    | 18-12-2025 05:00 AM       |
| London (UTC+0) | 18-12-2025 01:00 AM       |

---

## Example 3 – Admin in London (GMT)

**Admin Location:** London (GMT, UTC +0)

**Admin Sets Banner Time:**
01-01-2026 12:00 PM GMT

**Stored in Database (UTC):**
01-01-2026 12:00 PM UTC

### User Access Times

| User Location            | Banner Becomes Visible At |
| ------------------------ | ------------------------- |
| London (GMT)             | 12:00 PM                  |
| India (IST)              | 05:30 PM                  |
| Australia (AEDT, UTC+11) | 11:00 PM                  |
| USA (EST)                | 07:00 AM                  |

---

## Example 4 – Admin in Australia (AEDT)

**Admin Location:** Australia (AEDT, UTC +11)

**Admin Sets Banner Time:**
10-02-2026 09:00 AM AEDT

**Stored in Database (UTC):**
09-02-2026 10:00 PM UTC

### User Access Times

| User Location    | Banner Becomes Visible At |
| ---------------- | ------------------------- |
| Australia (AEDT) | 09:00 AM                  |
| India (IST)      | 03:30 AM                  |
| UAE (UTC+4)      | 12:00 AM                  |
| London (UTC+0)   | 10:00 PM (Previous Day)   |

---

## Admin-Side Requirements

* Automatically detect admin timezone (or allow manual selection)
* Convert selected local datetime to UTC before saving
* Never store local timezone values in the database

---

## User-Side Logic

* Detect user timezone
* Fetch banner UTC start time
* Display banner when:

```text
current_utc_time >= banner_start_utc
```

---

## What This System Avoids

* No country-specific banner times
* No duplicate datetime values
* No manual timezone adjustments
* No dependency on user location logic

---

## One-Line Requirement Statement

> Banner visibility must be timezone-independent and activate globally at the same UTC moment, regardless of admin or user location.

---

## Notes

* UTC must be the **single source of truth**
* All comparisons must occur in UTC
* UI may display local time for clarity, but logic must remain UTC-based
