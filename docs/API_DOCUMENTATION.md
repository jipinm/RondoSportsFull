# API Documentation - Rondo Sports

**Version 1.0.0** | November 19, 2025

Complete REST API documentation for the Rondo Sports Backend API.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Admin API Endpoints](#admin-api-endpoints)
4. [Customer API Endpoints](#customer-api-endpoints)
5. [Public API Endpoints](#public-api-endpoints)
6. [XS2Event Proxy Endpoints](#xs2event-proxy-endpoints)
7. [Database Schema](#database-schema)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)

---

## Overview

### Base URLs

- **Development:** `http://rondoapi.local`
- **Production:** `https://api.yourdomain.com`

### API Standards

- **Protocol:** RESTful HTTP/HTTPS
- **Data Format:** JSON
- **Character Encoding:** UTF-8
- **Authentication:** JWT (JSON Web Tokens)
- **Versioning:** URI path versioning (e.g., `/api/v1/`)

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Authentication

### JWT Token Authentication

The API uses JWT (JSON Web Tokens) for authentication with two separate systems:

1. **Admin Authentication** - For admin panel users
2. **Customer Authentication** - For customer frontend users

### Token Types

- **Access Token:** Short-lived (1 hour), used for API requests
- **Refresh Token:** Long-lived (24 hours), used to obtain new access tokens

### Admin Authentication

#### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "admin@rondo.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "admin@rondo.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "permissions": ["view_bookings", "manage_users", ...]
    }
  }
}
```

#### Refresh Token

```
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Logout

```
POST /auth/logout
Authorization: Bearer {access_token}
```

#### Get Current User

```
GET /auth/me
Authorization: Bearer {access_token}
```

#### Change Password

```
POST /auth/change-password
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password",
  "new_password_confirmation": "new_password"
}
```

### Customer Authentication

#### Register

```
POST /api/v1/customers/auth/register
```

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "country_code": "US",
  "date_of_birth": "1990-01-15"
}
```

#### Login

```
POST /api/v1/customers/auth/login
```

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!"
}
```

#### Forgot Password

```
POST /api/v1/customers/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

#### Reset Password

```
POST /api/v1/customers/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!",
  "password_confirmation": "NewSecurePass123!"
}
```

### Using JWT Tokens

Include the access token in the `Authorization` header:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## Admin API Endpoints

All admin endpoints require authentication and are prefixed with `/admin`.

### Dashboard

#### Get Dashboard Statistics

```
GET /admin/dashboard
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bookings": 245,
    "total_bookings_trend": 12.5,
    "total_revenue": 125430.50,
    "total_revenue_trend": 8.3,
    "active_customers": 156,
    "active_customers_trend": 5.2,
    "pending_cancellations": 3,
    "revenue_trend": [
      { "date": "2025-11-01", "revenue": 5230.50 },
      { "date": "2025-11-02", "revenue": 6180.00 }
    ],
    "booking_trend": [
      { "date": "2025-11-01", "bookings": 12 },
      { "date": "2025-11-02", "bookings": 15 }
    ],
    "recent_bookings": [ ... ],
    "top_events": [ ... ]
  }
}
```

#### Get Statistics for Date Range

```
GET /admin/dashboard/stats?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (required): End date (YYYY-MM-DD)

### Reports

#### Revenue Report

```
GET /admin/reports/revenue?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `start_date` (required)
- `end_date` (required)
- `group_by` (optional): `day`, `week`, `month` (default: `day`)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 125430.50,
    "total_bookings": 245,
    "average_order_value": 512.37,
    "refunded_amount": 3250.00,
    "revenue_by_period": [
      { "period": "2025-11-01", "revenue": 5230.50, "bookings": 12 },
      { "period": "2025-11-02", "revenue": 6180.00, "bookings": 15 }
    ],
    "revenue_by_sport": [
      { "sport": "Football", "revenue": 85230.50, "percentage": 67.9 },
      { "sport": "Basketball", "revenue": 40200.00, "percentage": 32.1 }
    ],
    "payment_status_breakdown": {
      "completed": 120430.50,
      "pending": 5000.00,
      "refunded": 3250.00
    }
  }
}
```

#### Bookings Report

```
GET /admin/reports/bookings?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer {access_token}
```

#### User Activity Report

```
GET /admin/reports/users?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer {access_token}
```

### Booking Management

#### Get All Bookings

```
GET /admin/bookings
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`, `refunded`)
- `payment_status` (optional): Filter by payment (`pending`, `completed`, `failed`, `refunded`)
- `search` (optional): Search by booking ID, customer name, or email
- `sport` (optional): Filter by sport type
- `event_id` (optional): Filter by event ID
- `start_date` (optional): Bookings from date
- `end_date` (optional): Bookings to date

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 123,
        "booking_id": "RND-20251119-123",
        "customer_id": 45,
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "event_id": 5678,
        "event_name": "Manchester United vs Liverpool",
        "sport": "Football",
        "total_amount": 450.00,
        "payment_status": "completed",
        "booking_status": "confirmed",
        "booking_date": "2025-11-19T10:30:00Z",
        "event_date": "2025-12-01T19:00:00Z",
        "tickets_count": 2,
        "cancellation_status": "none"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 13,
      "total_records": 245,
      "per_page": 20
    }
  }
}
```

#### Get Booking by ID

```
GET /admin/bookings/{id}
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 123,
      "booking_id": "RND-20251119-123",
      "customer": {
        "id": 45,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "event": {
        "id": 5678,
        "name": "Manchester United vs Liverpool",
        "date": "2025-12-01T19:00:00Z",
        "venue": "Old Trafford",
        "sport": "Football"
      },
      "orders": [
        {
          "order_number": 1,
          "guest_name": "John Doe",
          "guest_email": "john@example.com",
          "category_name": "VIP Section",
          "seat_number": "A12",
          "price": 225.00
        },
        {
          "order_number": 2,
          "guest_name": "Jane Doe",
          "guest_email": "jane@example.com",
          "category_name": "VIP Section",
          "seat_number": "A13",
          "price": 225.00
        }
      ],
      "payment": {
        "total_amount": 450.00,
        "payment_status": "completed",
        "payment_method": "stripe",
        "stripe_payment_intent_id": "pi_1234567890",
        "paid_at": "2025-11-19T10:35:00Z"
      },
      "status": {
        "booking_status": "confirmed",
        "cancellation_status": "none",
        "refund_amount": null
      },
      "xs2event": {
        "xs2event_booking_id": "XS2-987654",
        "sync_status": "synced"
      },
      "created_at": "2025-11-19T10:30:00Z",
      "updated_at": "2025-11-19T10:35:00Z"
    }
  }
}
```

#### Update Booking Status

```
PUT /admin/bookings/{id}/status
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Booking confirmed manually"
}
```

**Allowed Status Values:**
- `pending`
- `confirmed`
- `cancelled`
- `refunded`
- `expired`

#### Process Refund

```
POST /admin/bookings/{id}/refund
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "refund_amount": 450.00,
  "refund_reason": "Customer requested cancellation",
  "refund_method": "stripe"
}
```

#### Sync with XS2Event

```
POST /admin/bookings/{id}/sync-xs2event
Authorization: Bearer {access_token}
```

### Customer Management

#### Get All Customers

```
GET /admin/customers
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page`, `limit`, `search`, `status`, `country`, `start_date`, `end_date`

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 45,
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "country_code": "US",
        "country_name": "United States",
        "status": "active",
        "total_bookings": 5,
        "total_spent": 2250.00,
        "registered_at": "2025-10-15T08:20:00Z",
        "last_login": "2025-11-19T09:15:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### Get Customer by ID

```
GET /admin/customers/{id}
Authorization: Bearer {access_token}
```

#### Update Customer Status

```
PUT /admin/customers/{id}/status
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "status": "blocked",
  "reason": "Suspicious activity detected"
}
```

**Allowed Status Values:**
- `active` - Customer can use the platform
- `blocked` - Customer is blocked from logging in
- `suspended` - Temporary suspension

#### Update Customer Notes

```
PUT /admin/customers/{id}/notes
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "notes": "VIP customer - provide priority support"
}
```

### Cancellation Management

#### Get All Cancellation Requests

```
GET /admin/cancellation-requests
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status`: `pending`, `approved`, `declined`, `completed`
- `page`, `limit`, `search`

**Response:**
```json
{
  "success": true,
  "data": {
    "cancellation_requests": [
      {
        "id": 12,
        "booking_id": 123,
        "booking_reference": "RND-20251119-123",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "event_name": "Manchester United vs Liverpool",
        "event_date": "2025-12-01T19:00:00Z",
        "booking_amount": 450.00,
        "requested_at": "2025-11-18T14:30:00Z",
        "reason": "Unable to attend due to personal emergency",
        "status": "pending",
        "admin_notes": null,
        "processed_by": null,
        "processed_at": null
      }
    ],
    "pagination": { ... },
    "stats": {
      "pending": 3,
      "approved": 8,
      "declined": 2,
      "completed": 5
    }
  }
}
```

#### Get Cancellation Request

```
GET /admin/cancellation-requests/{id}
Authorization: Bearer {access_token}
```

#### Approve Cancellation Request

```
PATCH /admin/cancellation-requests/{id}/approve
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "refund_amount": 450.00,
  "admin_notes": "Approved - full refund issued",
  "process_refund": true
}
```

#### Reject Cancellation Request

```
PATCH /admin/cancellation-requests/{id}/reject
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "admin_notes": "Declined - event is within 24 hours",
  "rejection_reason": "Too close to event date"
}
```

#### Complete Cancellation

```
PATCH /admin/cancellation-requests/{id}/complete
Authorization: Bearer {access_token}
```

### Refund Management

#### Get All Refund Requests

```
GET /admin/refunds
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status`: `pending`, `approved`, `completed`, `failed`
- `page`, `limit`, `search`

#### Get Refund by ID

```
GET /admin/refunds/{id}
Authorization: Bearer {access_token}
```

#### Update Refund Status

```
PUT /admin/refunds/{id}/status
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "status": "completed",
  "refund_transaction_id": "re_1234567890",
  "admin_notes": "Refund processed via Stripe"
}
```

### Static Pages Management

#### Get All Pages

```
GET /admin/static-pages
Authorization: Bearer {access_token}
```

#### Get Page by ID

```
GET /admin/static-pages/{id}
Authorization: Bearer {access_token}
```

#### Create Page

```
POST /admin/static-pages
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "title": "About Us",
  "slug": "about-us",
  "content": "<h1>About Rondo Sports</h1><p>Content here...</p>",
  "meta_description": "Learn about Rondo Sports",
  "status": "published"
}
```

#### Update Page

```
PUT /admin/static-pages/{id}
Authorization: Bearer {access_token}
```

#### Delete Page

```
DELETE /admin/static-pages/{id}
Authorization: Bearer {access_token}
```

### Banner Management

#### Get All Banners

```
GET /admin/banners
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `location`: `homepage`, `events`, `checkout`
- `status`: `active`, `inactive`

**Response:**
```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "id": 1,
        "title": "Super Bowl 2026",
        "image_url": "https://api.yourdomain.com/images/banners/super-bowl-2026.jpg",
        "link_url": "/events/super-bowl-2026",
        "location": "homepage",
        "position": 1,
        "status": "active",
        "clicks": 125,
        "impressions": 3450,
        "ctr": 3.62,
        "start_date": "2025-11-01",
        "end_date": "2026-02-15"
      }
    ]
  }
}
```

#### Create Banner

```
POST /admin/banners
Authorization: Bearer {access_token}
```

**Request Body (multipart/form-data):**
```
title: "Super Bowl 2026"
link_url: "/events/super-bowl-2026"
location: "homepage"
position: 1
status: "active"
start_date: "2025-11-01"
end_date: "2026-02-15"
```

#### Upload Banner Image

```
POST /admin/banners/{id}/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: Image file (JPG, PNG, GIF, max 2MB)

#### Update Banner

```
PUT /admin/banners/{id}
Authorization: Bearer {access_token}
```

#### Delete Banner

```
DELETE /admin/banners/{id}
Authorization: Bearer {access_token}
```

### Admin User Management

#### Get All Admin Users

```
GET /admin/users
Authorization: Bearer {access_token}
```

#### Create Admin User

```
POST /admin/users
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "email": "newadmin@rondo.com",
  "password": "SecurePassword123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "role_id": 2,
  "status": "active"
}
```

#### Update Admin User

```
PUT /admin/users/{id}
Authorization: Bearer {access_token}
```

#### Delete Admin User

```
DELETE /admin/users/{id}
Authorization: Bearer {access_token}
```

### Role & Permission Management

#### Get All Roles

```
GET /admin/roles-management
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "super_admin",
        "display_name": "Super Administrator",
        "description": "Full system access",
        "user_count": 2,
        "permissions": [
          {
            "id": 1,
            "name": "view_dashboard",
            "category": "dashboard"
          },
          {
            "id": 2,
            "name": "manage_users",
            "category": "users"
          }
        ]
      }
    ]
  }
}
```

#### Get All Permissions

```
GET /admin/permissions
Authorization: Bearer {access_token}
```

#### Create Role

```
POST /admin/roles-management
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "support_agent",
  "display_name": "Support Agent",
  "description": "Customer support role",
  "permissions": [1, 2, 5, 8]
}
```

#### Update Role

```
PUT /admin/roles-management/{id}
Authorization: Bearer {access_token}
```

#### Delete Role

```
DELETE /admin/roles-management/{id}
Authorization: Bearer {access_token}
```

### Team Credentials Management

#### Get All Team Credentials

```
GET /admin/team-credentials
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `tournament_id`: Filter by tournament
- `featured`: Filter featured teams (`true`/`false`)
- `search`: Search by team name

#### Get Team Credential by ID

```
GET /admin/team-credentials/{id}
Authorization: Bearer {access_token}
```

#### Create Team Credential

```
POST /admin/team-credentials
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "tournament_id": 123,
  "team_id": 456,
  "team_name": "Manchester United",
  "logo_url": "/images/team/manchester-united.png",
  "is_featured": true,
  "display_order": 1
}
```

#### Update Team Credential

```
PUT /admin/team-credentials/{id}
Authorization: Bearer {access_token}
```

#### Delete Team Credential

```
DELETE /admin/team-credentials/{id}
Authorization: Bearer {access_token}
```

#### Toggle Featured Status

```
PATCH /admin/team-credentials/{id}/featured
Authorization: Bearer {access_token}
```

---

## Customer API Endpoints

All customer endpoints require customer authentication and are prefixed with `/api/v1/customers`.

### Profile Management

#### Get Profile

```
GET /api/v1/customers/profile
Authorization: Bearer {customer_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 45,
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "date_of_birth": "1990-01-15",
      "gender": "male",
      "country_code": "US",
      "country_name": "United States",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001"
      },
      "preferences": {
        "newsletter": true,
        "sms_notifications": false
      },
      "stats": {
        "total_bookings": 5,
        "total_spent": 2250.00,
        "upcoming_events": 2
      },
      "created_at": "2025-10-15T08:20:00Z"
    }
  }
}
```

#### Update Profile

```
PUT /api/v1/customers/profile
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
```

#### Update Address

```
PUT /api/v1/customers/profile/address
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "street": "456 Oak Avenue",
  "city": "Los Angeles",
  "state": "CA",
  "postal_code": "90001",
  "country_code": "US"
}
```

#### Change Password

```
PUT /api/v1/customers/profile/password
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "new_password_confirmation": "NewPassword456!"
}
```

#### Delete Account

```
DELETE /api/v1/customers/profile
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "password": "CurrentPassword123!",
  "confirmation": "DELETE MY ACCOUNT"
}
```

### Booking Management (Customer)

#### Get My Bookings

```
GET /api/v1/customers/bookings
Authorization: Bearer {customer_access_token}
```

**Query Parameters:**
- `page`, `limit`
- `status`: `upcoming`, `past`, `cancelled`

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 123,
        "booking_id": "RND-20251119-123",
        "event": {
          "id": 5678,
          "name": "Manchester United vs Liverpool",
          "date": "2025-12-01T19:00:00Z",
          "venue": "Old Trafford",
          "sport": "Football",
          "image_url": "/images/events/man-utd-vs-liverpool.jpg"
        },
        "tickets": [
          {
            "guest_name": "John Doe",
            "category": "VIP Section",
            "seat": "A12"
          }
        ],
        "total_amount": 450.00,
        "payment_status": "completed",
        "booking_status": "confirmed",
        "can_cancel": true,
        "cancellation_deadline": "2025-11-29T19:00:00Z",
        "booked_at": "2025-11-19T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### Get Booking Details

```
GET /api/v1/customers/bookings/{booking_id}
Authorization: Bearer {customer_access_token}
```

#### Create Booking

```
POST /api/v1/customers/bookings
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "event_id": 5678,
  "category_id": 12,
  "tickets": [
    {
      "guest_name": "John Doe",
      "guest_email": "john@example.com",
      "guest_phone": "+1234567890",
      "seat_number": "A12"
    }
  ],
  "payment_method": "stripe",
  "stripe_payment_intent_id": "pi_1234567890"
}
```

### E-Ticket Management

#### Get My Tickets

```
GET /api/v1/customers/tickets
Authorization: Bearer {customer_access_token}
```

**Query Parameters:**
- `status`: `upcoming`, `past`, `all`

#### Get Ticket Status

```
GET /api/v1/customers/bookings/{id}/tickets/status
Authorization: Bearer {customer_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets_available": true,
    "total_tickets": 2,
    "tickets": [
      {
        "ticket_number": "RONDO-2025-001-001",
        "guest_name": "John Doe",
        "seat": "A12",
        "status": "valid",
        "qr_code": "https://api.yourdomain.com/tickets/qr/..."
      }
    ]
  }
}
```

#### Download Ticket

```
GET /api/v1/customers/bookings/{id}/tickets/download
Authorization: Bearer {customer_access_token}
```

**Response:** PDF file download

#### Download All Tickets as ZIP

```
GET /api/v1/customers/bookings/{id}/tickets/zip
Authorization: Bearer {customer_access_token}
```

**Response:** ZIP file download containing all ticket PDFs

### Cancellation Requests (Customer)

#### Request Cancellation

```
POST /api/v1/customers/bookings/{id}/cancel-request
Authorization: Bearer {customer_access_token}
```

**Request Body:**
```json
{
  "reason": "Unable to attend due to personal emergency",
  "additional_notes": "Would appreciate expedited refund processing"
}
```

#### Get Cancellation Status

```
GET /api/v1/customers/bookings/{id}/cancel-request
Authorization: Bearer {customer_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cancellation_request": {
      "id": 12,
      "status": "pending",
      "requested_at": "2025-11-18T14:30:00Z",
      "reason": "Unable to attend due to personal emergency",
      "expected_refund_amount": 450.00,
      "admin_response": null,
      "processed_at": null
    }
  }
}
```

#### Cancel Cancellation Request

```
DELETE /api/v1/customers/bookings/{id}/cancel-request
Authorization: Bearer {customer_access_token}
```

---

## Public API Endpoints

These endpoints do not require authentication.

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T12:00:00Z",
  "version": "1.0.0"
}
```

### Static Pages (Public)

#### Get Published Pages

```
GET /api/v1/static-pages
```

#### Get Page by Slug

```
GET /api/v1/static-pages/{slug}
```

**Example:** `GET /api/v1/static-pages/about-us`

**Response:**
```json
{
  "success": true,
  "data": {
    "page": {
      "id": 1,
      "title": "About Us",
      "slug": "about-us",
      "content": "<h1>About Rondo Sports</h1><p>...</p>",
      "meta_description": "Learn about Rondo Sports",
      "updated_at": "2025-11-15T10:00:00Z"
    }
  }
}
```

### Banners (Public)

#### Get Banners by Location

```
GET /api/v1/banners/{location}
```

**Example:** `GET /api/v1/banners/homepage`

**Response:**
```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "id": 1,
        "title": "Super Bowl 2026",
        "image_url": "https://api.yourdomain.com/images/banners/super-bowl-2026.jpg",
        "link_url": "/events/super-bowl-2026",
        "position": 1
      }
    ]
  }
}
```

#### Track Banner Click

```
POST /api/v1/banners/{id}/click
```

#### Track Banner Impression

```
POST /api/v1/banners/{id}/impression
```

### Country Lookup

#### Get Active Countries

```
GET /api/v1/countries
```

**Response:**
```json
{
  "success": true,
  "data": {
    "countries": [
      {
        "code": "US",
        "name": "United States",
        "dial_code": "+1",
        "flag": "🇺🇸"
      },
      {
        "code": "GB",
        "name": "United Kingdom",
        "dial_code": "+44",
        "flag": "🇬🇧"
      }
    ]
  }
}
```

#### Search Countries

```
GET /api/v1/countries/search?q=united
```

### Payment Processing

#### Create Payment Intent (Stripe)

```
POST /api/v1/payments/create-payment-intent
```

**Request Body:**
```json
{
  "amount": 45000,
  "currency": "usd",
  "booking_reference": "RND-20251119-123",
  "customer_email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_1234567890_secret_abcdef",
    "payment_intent_id": "pi_1234567890"
  }
}
```

#### Stripe Webhook

```
POST /api/v1/payments/webhook
Stripe-Signature: {signature}
```

Handles Stripe webhook events for payment confirmation and refunds.

---

## XS2Event Proxy Endpoints

These endpoints proxy requests to the XS2Event API for sports data.

### Sports

```
GET /sports
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sport_id": 1,
      "sport_name": "Football",
      "sport_icon": "/images/sports/football.png",
      "tournaments_count": 25
    }
  ]
}
```

### Tournaments

```
GET /tournaments?sport_id={sport_id}
```

**Query Parameters:**
- `sport_id` (required): Sport ID

### Teams

```
GET /teams?tournament_id={tournament_id}
```

**Query Parameters:**
- `tournament_id` (required): Tournament ID

### Events

```
GET /events?tournament_id={tournament_id}
```

**Query Parameters:**
- `tournament_id` (optional)
- `team_id` (optional)
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `venue_id` (optional)

### Event Details

```
GET /events/{event_id}
```

### Venues

```
GET /venues/{venue_id}
```

### Categories (Seating)

```
GET /categories?event_id={event_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "category_id": 12,
        "category_name": "VIP Section",
        "price": 225.00,
        "currency": "USD",
        "available_seats": 50,
        "total_seats": 100,
        "venue_map": {
          "section": "A",
          "row_start": "1",
          "row_end": "10"
        }
      }
    ]
  }
}
```

### Tickets

```
GET /tickets?category_id={category_id}
```

### Ticket Reservation

```
POST /reservations
```

**Request Body:**
```json
{
  "category_id": 12,
  "quantity": 2,
  "customer_email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservation_id": "RES-20251119-456",
    "reserved_seats": ["A12", "A13"],
    "expires_at": "2025-11-19T10:45:00Z",
    "total_amount": 450.00
  }
}
```

---

## Database Schema

### Core Tables

#### `admin_users`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
email             VARCHAR(255) UNIQUE NOT NULL
password          VARCHAR(255) NOT NULL
first_name        VARCHAR(100)
last_name         VARCHAR(100)
role_id           BIGINT FOREIGN KEY references roles(id)
status            ENUM('active', 'inactive', 'suspended')
last_login_at     TIMESTAMP
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `customers`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
email             VARCHAR(255) UNIQUE NOT NULL
password          VARCHAR(255) NOT NULL
first_name        VARCHAR(100)
last_name         VARCHAR(100)
phone             VARCHAR(20)
date_of_birth     DATE
gender            ENUM('male', 'female', 'other')
country_code      VARCHAR(2)
status            ENUM('active', 'blocked', 'suspended')
email_verified    BOOLEAN DEFAULT FALSE
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `bookings`
```sql
id                      BIGINT PRIMARY KEY AUTO_INCREMENT
booking_id              VARCHAR(50) UNIQUE NOT NULL
customer_id             BIGINT FOREIGN KEY references customers(id)
xs2event_booking_id     VARCHAR(100)
event_id                BIGINT
event_name              VARCHAR(255)
event_date              DATETIME
sport_type              VARCHAR(50)
venue_name              VARCHAR(255)
total_amount            DECIMAL(10,2)
payment_status          ENUM('pending', 'completed', 'failed', 'refunded', 'partially_refunded')
booking_status          ENUM('pending', 'confirmed', 'cancelled', 'refunded', 'expired')
cancellation_status     ENUM('none', 'requested', 'approved', 'declined', 'cancelled')
stripe_payment_intent_id VARCHAR(255)
refund_amount           DECIMAL(10,2)
refund_reason           TEXT
created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at              TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `booking_orders`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
booking_id        BIGINT FOREIGN KEY references bookings(id)
order_number      INT
guest_name        VARCHAR(255)
guest_email       VARCHAR(255)
guest_phone       VARCHAR(20)
category_id       BIGINT
category_name     VARCHAR(255)
seat_number       VARCHAR(50)
price             DECIMAL(10,2)
ticket_number     VARCHAR(100) UNIQUE
qr_code           TEXT
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `cancellation_requests`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
booking_id        BIGINT FOREIGN KEY references bookings(id)
customer_id       BIGINT FOREIGN KEY references customers(id)
reason            TEXT NOT NULL
additional_notes  TEXT
status            ENUM('pending', 'approved', 'declined', 'cancelled', 'completed')
admin_notes       TEXT
processed_by      BIGINT FOREIGN KEY references admin_users(id)
processed_at      TIMESTAMP
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `refund_requests`
```sql
id                    BIGINT PRIMARY KEY AUTO_INCREMENT
booking_id            BIGINT FOREIGN KEY references bookings(id)
cancellation_request_id BIGINT FOREIGN KEY references cancellation_requests(id)
refund_amount         DECIMAL(10,2) NOT NULL
refund_method         ENUM('stripe', 'manual')
stripe_refund_id      VARCHAR(255)
status                ENUM('pending', 'approved', 'completed', 'failed', 'rejected')
admin_notes           TEXT
processed_by          BIGINT FOREIGN KEY references admin_users(id)
created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at            TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `roles`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
name              VARCHAR(50) UNIQUE NOT NULL
display_name      VARCHAR(100) NOT NULL
description       TEXT
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `permissions`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
name              VARCHAR(50) UNIQUE NOT NULL
display_name      VARCHAR(100) NOT NULL
category          VARCHAR(50)
description       TEXT
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `role_permissions`
```sql
role_id           BIGINT FOREIGN KEY references roles(id)
permission_id     BIGINT FOREIGN KEY references permissions(id)
PRIMARY KEY (role_id, permission_id)
```

#### `static_pages`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
title             VARCHAR(255) NOT NULL
slug              VARCHAR(255) UNIQUE NOT NULL
content           LONGTEXT
meta_description  TEXT
status            ENUM('published', 'draft')
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `banners`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
title             VARCHAR(255) NOT NULL
image_url         VARCHAR(500)
link_url          VARCHAR(500)
location          ENUM('homepage', 'events', 'checkout')
position          INT
status            ENUM('active', 'inactive')
clicks            INT DEFAULT 0
impressions       INT DEFAULT 0
start_date        DATE
end_date          DATE
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### `admin_activity_logs`
```sql
id                BIGINT PRIMARY KEY AUTO_INCREMENT
admin_user_id     BIGINT FOREIGN KEY references admin_users(id)
action            VARCHAR(100) NOT NULL
entity_type       VARCHAR(50)
entity_id         BIGINT
description       TEXT
ip_address        VARCHAR(45)
user_agent        TEXT
old_values        JSON
new_values        JSON
severity          ENUM('low', 'medium', 'high', 'critical')
created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Email is required", "Email must be valid"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | JWT token is invalid or expired |
| `ACCESS_DENIED` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `BOOKING_NOT_AVAILABLE` | 409 | Requested tickets are not available |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `INTERNAL_ERROR` | 500 | Server error occurred |
| `XS2EVENT_API_ERROR` | 502 | XS2Event API request failed |

---

## Rate Limiting

### Limits

- **Public endpoints:** 100 requests per minute per IP
- **Authenticated endpoints:** 300 requests per minute per user
- **Payment endpoints:** 20 requests per minute per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## API Versioning

The API uses URI path versioning:
- Current version: `v1`
- Base path: `/api/v1/`

When breaking changes are introduced, a new version will be released (e.g., `/api/v2/`). Previous versions will be supported for at least 6 months.

---

## Additional Resources

- **OpenAPI Specification:** `/openapi.json`
- **Postman Collection:** `docs/XS2Event-Proxy.postman_collection.json`
- **Frontend Integration:** See `frontend/src/services/` for API client examples
- **Admin Integration:** See `admin/src/services/` for API usage

---

**API Documentation Version:** 1.0.0  
**Last Updated:** November 19, 2025  
**Maintained by:** Rondo Development Team
