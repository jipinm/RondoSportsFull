# User Manual - Rondo Sports Admin Panel

**Version 1.0.0** | November 19, 2025

A comprehensive guide for administrators to manage the Rondo Sports ticket booking platform.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Booking Management](#booking-management)
4. [Customer Management](#customer-management)
5. [Cancellation Requests](#cancellation-requests)
6. [Refund Management](#refund-management)
7. [Content Management](#content-management)
8. [Banner Management](#banner-management)
9. [User Management](#user-management)
10. [Reports & Analytics](#reports--analytics)
11. [Settings](#settings)
12. [Best Practices](#best-practices)
13. [FAQ](#faq)

---

## Getting Started

### Accessing the Admin Panel

1. Open your web browser
2. Navigate to the admin panel URL: `https://admin.yourdomain.com`
3. You will see the login page

### Logging In

1. **Enter your credentials:**
   - **Email:** Your admin email address
   - **Password:** Your password

2. **Click "Sign In"**

3. You will be redirected to the Dashboard

### First Time Login

If this is your first time logging in:
1. You will be prompted to change your password
2. Choose a strong password (at least 8 characters, including uppercase, lowercase, numbers, and symbols)
3. Save your new password securely

### Forgot Password?

1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check your email for a password reset link
4. Click the link and enter your new password
5. Return to the login page and sign in with your new password

---

## Dashboard

The Dashboard is the first page you see after logging in. It provides an overview of your ticket booking system's performance.

### Key Metrics

**Total Bookings**
- Shows the total number of bookings made
- Trend indicator (↑ or ↓) shows percentage change compared to previous period
- Green means growth, red means decline

**Total Revenue**
- Displays total revenue from completed bookings
- Only includes bookings with "completed" payment status
- Trend shows revenue growth or decline

**Active Customers**
- Number of registered customers with "active" status
- Excludes blocked or suspended accounts

**Pending Cancellations**
- Number of cancellation requests awaiting admin review
- Click the number to go directly to cancellation requests page

### Charts and Graphs

**Revenue Trend Chart**
- Line chart showing revenue over time
- X-axis: Dates
- Y-axis: Revenue amount
- Hover over points to see exact values

**Booking Trend Chart**
- Bar chart showing number of bookings per day
- Helps identify peak booking periods
- Use this to plan marketing campaigns

**Top Performing Events**
- Lists events generating the most revenue
- Shows event name, bookings count, and total revenue
- Click on an event to see all its bookings

**Recent Bookings**
- Shows the 10 most recent bookings
- Quick view of booking ID, customer name, event, amount, and status
- Click "View All" to see complete bookings list

### Refreshing Data

- Dashboard data updates automatically every 5 minutes
- To manually refresh, click the refresh icon (🔄) at the top right
- Reports are generated in real-time

---

## Booking Management

Manage all ticket bookings made through the platform.

### Viewing All Bookings

1. Click **"Bookings"** in the left sidebar
2. You will see a table of all bookings

### Understanding Booking Statuses

**Booking Status:**
- 🟡 **Pending:** Booking created, awaiting confirmation
- 🟢 **Confirmed:** Booking is confirmed and valid
- 🔴 **Cancelled:** Booking was cancelled
- 🔵 **Refunded:** Booking was refunded
- ⚫ **Expired:** Booking expired (unpaid)

**Payment Status:**
- 🟡 **Pending:** Payment not received
- 🟢 **Completed:** Payment successful
- 🔴 **Failed:** Payment failed
- 🔵 **Refunded:** Payment refunded
- 🟣 **Partially Refunded:** Partial refund issued

### Searching for Bookings

Use the search bar at the top of the bookings page:
- Search by booking ID (e.g., "RND-20251119-123")
- Search by customer name
- Search by customer email
- Search by event name

### Filtering Bookings

**Filter by Status:**
1. Click the "Status" dropdown
2. Select: All, Pending, Confirmed, Cancelled, or Refunded
3. Table updates automatically

**Filter by Payment Status:**
1. Click the "Payment" dropdown
2. Select payment status

**Filter by Sport:**
1. Click the "Sport" dropdown
2. Select sport type (Football, Basketball, etc.)

**Filter by Date Range:**
1. Click "Start Date" and select from date
2. Click "End Date" and select to date
3. Click "Apply Filters"

### Viewing Booking Details

1. Find the booking in the table
2. Click on the booking row or click the **"View"** button
3. A detailed view opens showing:
   - **Customer Information:** Name, email, phone
   - **Event Details:** Event name, date, venue, sport
   - **Ticket Information:** Guest names, seat numbers, category
   - **Payment Information:** Amount, payment method, transaction ID
   - **Status Information:** Booking status, payment status, cancellation status

### Confirming a Booking

If a booking is pending:
1. Open the booking details
2. Review all information carefully
3. Click **"Confirm Booking"** button
4. Add optional notes
5. Click **"Confirm"**
6. Customer receives confirmation email automatically

### Cancelling a Booking

⚠️ **Important:** Only cancel bookings if absolutely necessary.

1. Open the booking details
2. Click **"Cancel Booking"** button
3. Enter cancellation reason (required)
4. Choose whether to process refund:
   - ☑️ **Process Refund:** Issues refund automatically via Stripe
   - ☐ **No Refund:** Cancels without refund (customer forfeits payment)
5. Click **"Confirm Cancellation"**
6. Customer receives cancellation email

### Processing a Refund

1. Open the booking details
2. Click **"Process Refund"** button
3. Enter refund amount (default is full booking amount)
4. Enter refund reason (required)
5. Select refund method:
   - **Stripe:** Automatic refund via Stripe (recommended)
   - **Manual:** Mark as refunded, but process outside system
6. Click **"Process Refund"**
7. System contacts Stripe and processes refund
8. Customer receives refund confirmation email
9. Refund appears in customer's account within 5-10 business days

**Partial Refunds:**
- To issue a partial refund, enter an amount less than the booking total
- Common scenarios: Late cancellation fee, partial attendance

### Syncing with XS2Event

If a booking was not automatically synced with XS2Event:
1. Open the booking details
2. Click **"Sync with XS2Event"** button
3. System attempts to create booking in XS2Event
4. If successful, XS2Event booking ID is saved
5. If failed, error message displayed (contact XS2Event support)

### Checking Ticket Status

To verify e-tickets are available:
1. Open the booking details
2. Click **"Check Tickets"** button
3. System queries XS2Event for ticket availability
4. Status displayed (Available, Pending, Error)

### Exporting Bookings

To export bookings to Excel/CSV:
1. Apply desired filters
2. Click **"Export"** button at top right
3. Choose format: Excel (.xlsx) or CSV (.csv)
4. File downloads automatically
5. Open in Microsoft Excel or Google Sheets

**Export includes:**
- All booking details
- Customer information
- Payment details
- Event information

---

## Customer Management

Manage all registered customers and their accounts.

### Viewing All Customers

1. Click **"Customers"** in the left sidebar
2. You will see a table of all registered customers

### Customer Information Displayed

- **Name:** First and last name
- **Email:** Email address
- **Phone:** Contact number
- **Country:** Country of residence
- **Status:** Active, Blocked, or Suspended
- **Total Bookings:** Number of bookings made
- **Total Spent:** Total amount spent
- **Registered:** Registration date
- **Last Login:** Most recent login date

### Searching for Customers

- Search by name, email, or phone number
- Use the search bar at the top of the page
- Results update as you type

### Filtering Customers

**Filter by Status:**
- All
- Active
- Blocked
- Suspended

**Filter by Country:**
- Select from dropdown list

**Filter by Registration Date:**
- Choose start and end dates

### Viewing Customer Details

1. Click on a customer row or click **"View"** button
2. Customer details page opens showing:
   - **Profile Information:** Name, email, phone, date of birth, gender
   - **Address:** Street, city, state, postal code, country
   - **Account Status:** Active, blocked, or suspended
   - **Statistics:** Total bookings, total spent, upcoming events
   - **Booking History:** All bookings made by customer
   - **Admin Notes:** Internal notes (not visible to customer)

### Blocking a Customer

⚠️ **Use carefully:** Blocked customers cannot log in or make bookings.

**When to block:**
- Fraudulent activity suspected
- Repeated chargebacks
- Terms of service violations
- Multiple failed payment attempts

**How to block:**
1. Open customer details
2. Click **"Block Customer"** button
3. Enter reason for blocking (required - for internal records)
4. Click **"Confirm Block"**
5. Customer status changes to "Blocked"
6. Customer receives email notification
7. Customer cannot log in until unblocked

### Unblocking a Customer

1. Open blocked customer's details
2. Click **"Unblock Customer"** button
3. Optionally add a note
4. Click **"Confirm Unblock"**
5. Customer can now log in again

### Suspending a Customer

**Difference between Block and Suspend:**
- **Block:** Permanent until manually unblocked
- **Suspend:** Temporary, can set expiration date

**How to suspend:**
1. Open customer details
2. Click **"Suspend Customer"** button
3. Enter reason
4. Set suspension duration (days) or leave blank for indefinite
5. Click **"Confirm Suspension"**

### Adding Admin Notes

Admin notes are internal only - customers never see them.

**Use cases:**
- Document customer interactions
- Note special requests or preferences
- Record issues or complaints
- Mark VIP customers

**How to add notes:**
1. Open customer details
2. Scroll to **"Admin Notes"** section
3. Click **"Add Note"** button
4. Type your note
5. Click **"Save"**
6. Note is timestamped with your name

### Viewing Customer Bookings

From customer details page:
1. Scroll to **"Booking History"** section
2. See all bookings made by this customer
3. Click on any booking to view full details
4. Filter by: Upcoming, Past, Cancelled

### Exporting Customer Data

1. Apply desired filters
2. Click **"Export"** button
3. Choose format: Excel or CSV
4. File downloads with all customer data

**Export includes:**
- Profile information
- Contact details
- Booking statistics
- Registration and login dates

---

## Cancellation Requests

Handle customer requests to cancel their bookings.

### Understanding the Cancellation Workflow

1. **Customer submits request** → Status: "Pending"
2. **Admin reviews request** → You're here!
3. **Admin approves or declines** → Status: "Approved" or "Declined"
4. **If approved, refund processed** → Status: "Completed"

### Viewing Cancellation Requests

1. Click **"Cancellation Requests"** in the left sidebar
2. All requests are displayed in a table

### Request Information

Each request shows:
- **Request ID:** Unique identifier
- **Booking Reference:** Associated booking ID
- **Customer:** Name and email
- **Event:** Event name and date
- **Amount:** Booking amount (potential refund)
- **Requested:** Date request was submitted
- **Reason:** Customer's stated reason
- **Status:** Pending, Approved, Declined, or Completed

### Filtering Requests

Use the status filter dropdown:
- **Pending:** Awaiting your review (action required)
- **Approved:** Approved, pending refund
- **Declined:** Rejected requests
- **Completed:** Fully processed with refund
- **All:** View all requests

**💡 Tip:** Always check "Pending" first - these need your attention!

### Reviewing a Request

1. Click on a request to view full details
2. Review information:
   - Customer's reason for cancellation
   - Additional notes provided by customer
   - Booking details (event date, amount, tickets)
   - Event proximity (how soon is the event?)
   - Cancellation policy compliance

### Approving a Cancellation Request

**Before approving, verify:**
- ✅ Request is within cancellation policy timeframe
- ✅ Event hasn't started or passed
- ✅ Reason is valid
- ✅ No signs of abuse

**Steps to approve:**
1. Click **"Approve Request"** button
2. Review refund amount (can be modified):
   - **Full Refund:** Enter booking total amount
   - **Partial Refund:** Enter reduced amount (e.g., after deducting fee)
   - **No Refund:** Enter 0 (if policy states no refund)
3. Add admin notes (required):
   - Document why you approved
   - Note any special circumstances
   - Example: "Approved - customer provided medical certificate"
4. Choose whether to process refund immediately:
   - ☑️ **Process Refund Now:** Stripe refund issued automatically
   - ☐ **Manual Processing:** You'll handle refund separately
5. Click **"Confirm Approval"**
6. Request status changes to "Approved"
7. If auto-refund selected, status becomes "Completed" immediately
8. Customer receives approval email

### Declining a Cancellation Request

**Valid reasons to decline:**
- Event already started or passed
- Request outside cancellation policy window
- No refund policy applies to this ticket type
- Multiple cancellation attempts (potential abuse)
- Insufficient reason provided

**Steps to decline:**
1. Click **"Decline Request"** button
2. Enter rejection reason (required):
   - Be professional and clear
   - Reference policy if applicable
   - Example: "Request declined - event is within 24 hours, per cancellation policy"
3. Add admin notes (optional - internal only)
4. Click **"Confirm Decline"**
5. Request status changes to "Declined"
6. Customer receives decline email with your reason

### Handling Special Cases

**Medical Emergencies:**
- Request proof (medical certificate)
- Usually approve with full refund
- Document in admin notes

**Force Majeure (Natural Disasters, Pandemics):**
- Follow company policy
- May require management approval for full refund
- Document decision clearly

**Event Cancelled by Organizer:**
- Always approve with full refund
- Process immediately
- Mark booking as "Cancelled - Event Cancelled"

**Duplicate Booking:**
- Verify it's truly a duplicate
- Approve with full refund
- Investigate how duplicate occurred

### Setting Cancellation Policies

(Requires Admin or Super Admin role)

1. Go to **Settings** → **Cancellation Policy**
2. Set default rules:
   - **Cancellation Window:** Days before event when cancellation is allowed
   - **Refund Percentage:** Percentage of booking to refund
   - **Late Cancellation Fee:** Fee for last-minute cancellations
3. Rules apply to all new bookings

---

## Refund Management

Track and manage all refunds issued to customers.

### Viewing All Refunds

1. Click **"Refunds"** in the left sidebar
2. All refund requests are displayed

### Refund Status

- 🟡 **Pending:** Refund initiated, awaiting processing
- 🟢 **Approved:** Refund approved by admin
- 🔵 **Completed:** Refund successfully processed
- 🔴 **Failed:** Refund processing failed
- ⚫ **Rejected:** Refund request rejected

### Refund Information

Each refund shows:
- **Refund ID**
- **Booking Reference**
- **Customer Name**
- **Refund Amount**
- **Refund Method:** Stripe or Manual
- **Status**
- **Transaction ID:** Stripe refund ID (if processed via Stripe)
- **Requested Date**
- **Completed Date**

### Viewing Refund Details

1. Click on a refund to view full details
2. See:
   - Original booking information
   - Refund reason
   - Admin notes
   - Stripe transaction details
   - Processing history

### Processing Manual Refunds

If a refund was marked as "Manual" (processed outside Stripe):

1. Open the refund details
2. Process refund through your payment system
3. Obtain transaction reference number
4. Return to admin panel
5. Click **"Mark as Completed"** button
6. Enter transaction reference ID
7. Add notes about how refund was processed
8. Click **"Confirm"**
9. Status changes to "Completed"

### Handling Failed Refunds

If a Stripe refund fails:

1. Review failure reason (shown in refund details)
2. Common issues:
   - Original payment was refunded already
   - Insufficient balance in Stripe account
   - Payment method no longer valid
3. Click **"Retry Refund"** to attempt again
4. If retry fails, process manually:
   - Contact Stripe support or
   - Process refund through alternative method
5. Update refund status accordingly

### Refund Statistics

View refund statistics:
- **Total Refunds:** Total amount refunded
- **Refund Rate:** Percentage of bookings refunded
- **Average Refund:** Average refund amount
- **Refunds by Reason:** Breakdown of refund reasons

Access via **Reports** → **Refund Report**

---

## Content Management

Manage static pages displayed on the customer-facing website.

### Static Pages

**Default Pages:**
- **About Us:** Information about your company
- **Terms & Conditions:** Legal terms
- **Privacy Policy:** Data privacy policy
- **Refund Policy:** Refund terms and conditions
- **Contact Us:** Contact information and form

### Viewing All Pages

1. Click **"Content"** in the left sidebar
2. All static pages are listed

### Editing a Page

1. Click on the page you want to edit
2. Page editor opens with rich text editor
3. Edit the content:
   - **Title:** Page title (shown in browser tab)
   - **Slug:** URL-friendly identifier (e.g., "about-us" for /about-us)
   - **Content:** Page body (use rich text editor)
   - **Meta Description:** SEO description (160 characters max)
   - **Status:** Published or Draft

### Using the Rich Text Editor

**Formatting Options:**
- **Bold:** Select text, click B button
- **Italic:** Select text, click I button
- **Underline:** Select text, click U button
- **Headings:** Select heading level (H1, H2, H3)
- **Lists:** Bulleted or numbered lists
- **Links:** Select text, click link icon, enter URL
- **Images:** Click image icon, upload or enter URL

**💡 Best Practices:**
- Use H1 for page title only (once per page)
- Use H2 for main sections
- Use H3 for subsections
- Keep paragraphs short (3-4 sentences)
- Use lists for easy scanning

### Creating a New Page

1. Click **"New Page"** button
2. Fill in page details:
   - Title (required)
   - Slug (auto-generated from title, can edit)
   - Content (use editor)
   - Meta description
3. Set status:
   - **Draft:** Not visible to public (for preview/editing)
   - **Published:** Live on website
4. Click **"Save"**

### Publishing a Draft Page

1. Open the draft page
2. Review content
3. Change status to **"Published"**
4. Click **"Update"**
5. Page is now live on website

### Unpublishing a Page

To temporarily hide a page:
1. Open the page
2. Change status to **"Draft"**
3. Click **"Update"**
4. Page is no longer accessible to public

### Deleting a Page

⚠️ **Warning:** Deletion is permanent!

1. Open the page
2. Click **"Delete Page"** button
3. Confirm deletion
4. Page is permanently removed

**Note:** Cannot delete default system pages (About, Terms, Privacy)

### Preview Before Publishing

1. While editing, click **"Preview"** button
2. New tab opens showing how page will look on website
3. Review formatting, links, images
4. Close preview tab
5. Make adjustments if needed
6. Save or publish

---

## Banner Management

Manage promotional banners displayed on the homepage and other pages.

### Understanding Banner Locations

**Homepage Banner:**
- Large hero banner at top of homepage
- Recommended size: 1920x600 pixels
- Supports link to event or page

**Events Page Banner:**
- Smaller banner on events listing page
- Recommended size: 1200x400 pixels

**Checkout Banner:**
- Promotional banner during checkout
- Recommended size: 800x200 pixels

### Viewing All Banners

1. Click **"Banners"** in the left sidebar
2. All banners are listed with preview thumbnails

### Banner Information

- **Title:** Internal name (not shown to public)
- **Image:** Banner image preview
- **Location:** Where banner is displayed
- **Position:** Display order (1 = first)
- **Status:** Active or Inactive
- **Dates:** Start and end dates
- **Performance:** Clicks and impressions
- **CTR:** Click-through rate (clicks ÷ impressions)

### Creating a New Banner

1. Click **"New Banner"** button
2. Fill in banner details:

   **Basic Information:**
   - **Title:** Internal name (e.g., "Super Bowl 2026 Promo")
   - **Location:** Choose where to display (Homepage, Events, Checkout)
   - **Position:** Display order (lower numbers show first)

   **Image:**
   - Click **"Upload Image"** button
   - Select image file (JPG, PNG, or GIF)
   - Maximum file size: 2MB
   - Wait for upload to complete

   **Link:**
   - **Link URL:** Where banner links to (e.g., "/events/super-bowl-2026")
   - Can link to:
     - Event page
     - Sport/tournament page
     - External website (use full URL with https://)
     - Static page

   **Schedule:**
   - **Start Date:** When banner becomes active
   - **End Date:** When banner stops showing
   - Leave end date empty for indefinite

   **Status:**
   - **Active:** Banner is displayed
   - **Inactive:** Banner exists but not shown

3. Click **"Save"**
4. Banner is created and (if active and within date range) immediately displayed on website

### Editing a Banner

1. Click on banner to edit
2. Make changes:
   - Update title, image, link, or dates
   - Change position to reorder banners
   - Toggle between active/inactive
3. Click **"Update"**
4. Changes appear immediately on website

### Reordering Banners

If multiple banners exist in same location:

**Option 1: Drag and Drop**
1. On banners list page
2. Drag banner rows to reorder
3. Release to drop in new position
4. Order saves automatically

**Option 2: Edit Position Number**
1. Edit banner
2. Change position number (1, 2, 3, etc.)
3. Save

**Display Rule:** Lower position numbers show first

### Deactivating a Banner

To temporarily hide without deleting:
1. Edit banner
2. Change status to **"Inactive"**
3. Save
4. Banner no longer displayed but data preserved

### Deleting a Banner

1. Click on banner
2. Click **"Delete Banner"** button
3. Confirm deletion
4. Banner and image are permanently removed

### Viewing Banner Performance

1. Click on banner to view details
2. Scroll to **"Performance Metrics"** section
3. See:
   - **Impressions:** How many times banner was viewed
   - **Clicks:** How many times banner was clicked
   - **CTR (Click-Through Rate):** Clicks ÷ Impressions × 100
   - **Chart:** Performance over time

**💡 Good CTR benchmark:** 1-3% is typical for banners

### Best Practices for Banners

**Image Design:**
- Use high-quality images
- Include clear call-to-action text
- Keep text large and readable
- Use contrasting colors
- Avoid clutter

**Scheduling:**
- Schedule banners for upcoming events
- Remove expired event banners promptly
- Rotate banners regularly (every 1-2 weeks)

**Performance:**
- Monitor CTR weekly
- Replace low-performing banners (CTR < 0.5%)
- A/B test different images/messages
- Feature popular events

**Technical:**
- Optimize image file size (compress before upload)
- Use web-friendly formats (JPG for photos, PNG for graphics)
- Test links before publishing

---

## User Management

Manage admin users who can access the admin panel.

**Note:** User management typically requires "Admin" or "Super Admin" role.

### Viewing All Admin Users

1. Click **"Users"** in the left sidebar (under Admin section)
2. All admin users are listed

### User Information

- **Name:** First and last name
- **Email:** Email address (used for login)
- **Role:** Super Admin, Admin, Support Agent, etc.
- **Status:** Active, Inactive, or Suspended
- **Last Login:** Most recent login time
- **Created:** Account creation date

### User Roles Explained

**Super Admin:**
- Full system access
- Can manage users and roles
- Can access all features
- Cannot be deleted or downgraded by other users

**Admin:**
- Most features accessible
- Can manage bookings, customers, refunds
- Can view reports
- Cannot manage users or roles

**Support Agent:**
- View bookings and customers
- Cannot process refunds
- Cannot access reports
- Cannot modify settings

**Content Manager:**
- Manage static pages and banners
- Cannot access bookings or customers
- Cannot view financial data

**Custom Roles:**
- Your system may have additional custom roles
- Permissions defined per role

### Creating a New Admin User

1. Click **"New User"** button
2. Fill in user details:
   - **Email:** Must be unique
   - **Password:** Temporary password (user should change on first login)
   - **First Name:** User's first name
   - **Last Name:** User's last name
   - **Role:** Select appropriate role
   - **Status:** Active (usually) or Inactive
3. Click **"Create User"**
4. New user receives welcome email with login instructions

**💡 Tip:** Give new users least privilege (most restrictive role) initially. Upgrade if needed.

### Editing a User

1. Click on user to edit
2. Can change:
   - Name
   - Email (if not used for login yet)
   - Role
   - Status
3. Click **"Update"**

**Note:** Cannot edit Super Admin roles unless you are also a Super Admin.

### Resetting a User's Password

If a user forgets their password:

**Option 1: User Self-Service**
1. User clicks "Forgot Password?" on login page
2. User receives reset email
3. User creates new password

**Option 2: Admin Reset**
1. Open user details
2. Click **"Reset Password"** button
3. Generate temporary password
4. Send password to user securely
5. User must change on first login

### Deactivating a User

To temporarily disable access:
1. Edit user
2. Change status to **"Inactive"**
3. Save
4. User cannot log in until reactivated

**Use cases:**
- Employee on leave
- Temporary contractors
- Pending investigation

### Suspending a User

Similar to deactivating but with optional expiration:
1. Edit user
2. Change status to **"Suspended"**
3. Set suspension duration (days)
4. Save

### Deleting a User

⚠️ **Caution:** This is permanent!

**Before deleting:**
- Ensure user is no longer needed
- Check if user has pending actions
- Consider deactivating instead

**Steps:**
1. Open user details
2. Click **"Delete User"** button
3. Confirm deletion
4. User account is permanently removed

**Note:**
- Cannot delete Super Admin users
- Cannot delete yourself
- Activity logs remain (for audit trail)

### Managing Roles and Permissions

(Super Admin only)

1. Go to **"Roles"** page
2. View all roles and their permissions
3. Click on a role to edit
4. **Add/Remove Permissions:**
   - ☑️ Check to grant permission
   - ☐ Uncheck to revoke permission
5. Click **"Update Role"**

**Common Permissions:**
- `view_dashboard` - See dashboard
- `view_bookings` - View bookings list
- `manage_bookings` - Edit/cancel bookings
- `process_refunds` - Issue refunds
- `view_customers` - View customer list
- `manage_customers` - Edit/block customers
- `manage_content` - Edit static pages
- `manage_banners` - Manage banners
- `manage_users` - Add/edit admin users
- `view_reports` - Access reports
- `manage_settings` - Change system settings

### Creating a Custom Role

1. Go to **"Roles"** page
2. Click **"New Role"** button
3. Enter role details:
   - **Name:** Internal identifier (e.g., "marketing_manager")
   - **Display Name:** Friendly name (e.g., "Marketing Manager")
   - **Description:** Role purpose
4. Select permissions
5. Click **"Create Role"**

**Use case examples:**
- **Marketing Manager:** Manage banners and content only
- **Finance Reviewer:** View reports and bookings (read-only)
- **Customer Support Lead:** Manage customers and view bookings

---

## Reports & Analytics

Generate detailed reports on bookings, revenue, and customer activity.

### Accessing Reports

1. Click **"Reports"** in the left sidebar
2. Reports dashboard displays with key metrics

### Report Types

#### Revenue Report

Shows financial performance over time.

**Includes:**
- Total revenue
- Revenue by period (daily, weekly, monthly)
- Revenue by sport
- Revenue by payment status
- Average order value
- Refunded amount

**How to generate:**
1. Select **"Revenue Report"** tab
2. Choose date range:
   - Start Date
   - End Date
3. Select grouping:
   - Day (for short periods)
   - Week (for monthly analysis)
   - Month (for yearly analysis)
4. Click **"Generate Report"**
5. View charts and tables
6. Click **"Export"** to download

**Use cases:**
- Monthly financial reports
- Year-over-year comparison
- Sport performance analysis
- Budget planning

#### Booking Report

Analyze booking patterns and trends.

**Includes:**
- Total bookings
- Bookings by status
- Bookings by sport
- Bookings by event
- Average tickets per booking
- Cancellation rate
- No-show rate

**How to generate:**
1. Select **"Booking Report"** tab
2. Choose date range
3. Optional filters:
   - Sport type
   - Booking status
   - Event
4. Click **"Generate Report"**

**Use cases:**
- Identify popular events
- Spot booking trends
- Analyze cancellation patterns
- Plan inventory

#### User Activity Report

Track customer behavior and engagement.

**Includes:**
- New registrations
- Active users
- Total users
- User growth rate
- Average bookings per user
- User retention rate
- Top customers (by spending)

**How to generate:**
1. Select **"User Activity"** tab
2. Choose date range
3. Click **"Generate Report"**

**Use cases:**
- Monitor user growth
- Identify VIP customers
- Measure engagement
- Plan retention campaigns

### Date Range Selection

**Quick Filters:**
- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- This Month
- Last Month
- This Year

**Custom Range:**
1. Click "Custom Range"
2. Select start date
3. Select end date
4. Click "Apply"

**💡 Tip:** For year-over-year comparison, select same date ranges from different years and compare side-by-side.

### Understanding Charts

**Line Charts (Revenue Trend):**
- X-axis: Time period
- Y-axis: Amount
- Hover over points for exact values
- Compare multiple lines for different metrics

**Bar Charts (Bookings by Sport):**
- Each bar represents a category
- Height indicates quantity or amount
- Click on bar to drill down (if available)

**Pie Charts (Revenue by Sport):**
- Each slice represents percentage of total
- Hover for exact values
- Useful for seeing proportions at a glance

### Exporting Reports

**Export Formats:**
- **Excel (.xlsx):** Full formatting, charts included
- **CSV (.csv):** Raw data, open in any spreadsheet software
- **PDF (.pdf):** Formatted report, suitable for printing/sharing

**How to export:**
1. Generate report
2. Click **"Export"** button at top right
3. Choose format
4. File downloads automatically
5. Open with appropriate application

**💡 Tip:** Use Excel for further analysis, PDF for presentations, CSV for importing to other systems.

### Scheduling Automated Reports

(If feature is available in your version)

1. Go to **"Reports"** → **"Scheduled Reports"**
2. Click **"New Schedule"** button
3. Configure:
   - Report type
   - Date range (e.g., "Last 30 Days")
   - Frequency: Daily, Weekly, Monthly
   - Recipients: Email addresses
   - Format: Excel, PDF
4. Click **"Schedule"**
5. Reports are automatically generated and emailed

**Use cases:**
- Daily booking summary to operations team
- Monthly revenue report to finance team
- Weekly customer activity report to marketing

### Key Performance Indicators (KPIs)

**Booking KPIs:**
- **Conversion Rate:** Reservations → Bookings %
- **Average Order Value (AOV):** Total Revenue ÷ Total Bookings
- **Cancellation Rate:** Cancelled Bookings ÷ Total Bookings %
- **Refund Rate:** Refunded Bookings ÷ Total Bookings %

**Customer KPIs:**
- **Customer Acquisition:** New customers per period
- **Customer Lifetime Value (CLV):** Average total spent per customer
- **Repeat Customer Rate:** Customers with 2+ bookings %
- **Churn Rate:** Inactive customers %

**Financial KPIs:**
- **Revenue Growth:** Current period vs previous period %
- **Average Ticket Price:** Total Revenue ÷ Total Tickets Sold
- **Revenue per Customer:** Total Revenue ÷ Total Customers
- **Net Revenue:** Revenue - Refunds

### Benchmarking

**Typical Industry Benchmarks:**
- Cancellation Rate: 5-10% (lower is better)
- Refund Rate: 2-5% (lower is better)
- Repeat Customer Rate: 30-40% (higher is better)
- Conversion Rate (reservation to booking): 60-80% (higher is better)

Compare your metrics to these benchmarks to identify areas for improvement.

---

## Settings

Configure system-wide settings and preferences.

**Note:** Settings access usually requires Admin or Super Admin role.

### Accessing Settings

1. Click **"Settings"** in the left sidebar
2. Settings page opens with multiple tabs

### General Settings

**Company Information:**
- Company Name
- Support Email
- Support Phone
- Address

**System Settings:**
- Timezone
- Date Format
- Currency
- Language

**Email Settings:**
- SMTP Server
- SMTP Port
- Email Username
- Email Password
- From Address
- From Name

### Cancellation Policy Settings

Configure default cancellation rules:

**Cancellation Window:**
- Days before event when cancellation is allowed
- Example: "7 days" means customers can cancel up to 7 days before event

**Refund Percentage:**
- Percentage of booking amount to refund
- Can vary by timing:
  - More than 14 days: 100%
  - 7-14 days: 75%
  - Less than 7 days: 50%
  - Less than 24 hours: 0%

**Late Cancellation Fee:**
- Fixed fee for last-minute cancellations
- Deducted from refund amount

### Payment Settings

**Stripe Configuration:**
- Stripe Publishable Key
- Stripe Secret Key (hidden)
- Webhook Secret

**Payment Methods:**
- Enable/disable payment methods
- Credit Card
- Debit Card
- Digital Wallets (Apple Pay, Google Pay)

**Currency:**
- Select default currency
- Multi-currency support (if available)

### XS2Event Integration

**API Configuration:**
- XS2Event API URL
- API Key (hidden)
- Sync Frequency

**Sync Settings:**
- Auto-sync bookings
- Sync interval (minutes)
- Retry failed syncs

### Notification Settings

**Email Notifications:**
- ☑️ Booking Confirmation
- ☑️ Payment Received
- ☑️ Booking Cancelled
- ☑️ Refund Processed
- ☑️ E-Ticket Available
- ☐ Marketing Emails (customer opt-in)

**Admin Notifications:**
- ☑️ New Booking
- ☑️ Cancellation Request
- ☑️ Refund Request
- ☑️ Payment Failed
- ☑️ System Errors

**Notification Recipients:**
- Add admin email addresses to receive notifications

### Security Settings

**Password Policy:**
- Minimum length (recommended: 8+)
- Require uppercase
- Require lowercase
- Require numbers
- Require symbols
- Password expiration (days)

**Session Settings:**
- Session timeout (minutes)
- Concurrent sessions allowed

**Login Security:**
- Max login attempts
- Lockout duration
- Two-factor authentication (if available)

### Backup Settings

(If available in your system)

**Automated Backups:**
- Backup frequency: Daily, Weekly
- Backup time (server timezone)
- Retention period (days)
- Backup storage location

**Manual Backup:**
- Click "Backup Now" to create immediate backup

### Saving Settings

**Important:** Always click **"Save Changes"** button at bottom of page after making changes.

**💡 Tip:** Test critical settings (like email) after saving to ensure they work correctly.

---

## Best Practices

### For Booking Management

✅ **Do:**
- Review pending bookings daily
- Confirm bookings within 24 hours
- Document cancellation reasons
- Process refunds promptly
- Keep customers informed

❌ **Don't:**
- Leave bookings in pending status for long periods
- Cancel bookings without valid reason
- Process partial refunds without explanation
- Forget to sync with XS2Event

### For Customer Management

✅ **Do:**
- Respond to customer inquiries quickly
- Document customer interactions in notes
- Block only when necessary (fraud, abuse)
- Unblock when issues resolved
- Maintain customer privacy

❌ **Don't:**
- Block customers without investigation
- Share customer data externally
- Leave complaints unresolved
- Delete customer accounts unnecessarily

### For Cancellation Handling

✅ **Do:**
- Follow cancellation policy consistently
- Be fair and empathetic
- Document all decisions
- Process refunds quickly when approved
- Communicate decisions clearly to customers

❌ **Don't:**
- Make arbitrary decisions
- Ignore cancellation policy
- Delay refunds after approval
- Decline without proper reason
- Be rude or dismissive

### For Content Management

✅ **Do:**
- Keep content up-to-date
- Use proper formatting (headings, lists)
- Optimize for SEO
- Preview before publishing
- Save drafts frequently

❌ **Don't:**
- Copy content from other websites
- Use complex jargon
- Create walls of text
- Forget to update outdated information
- Delete pages that may still be linked

### For Security

✅ **Do:**
- Use strong passwords
- Log out when finished
- Review activity logs regularly
- Keep software updated
- Limit user access to what's necessary

❌ **Don't:**
- Share login credentials
- Use public computers for admin access
- Leave computer unattended while logged in
- Grant Super Admin access freely
- Ignore security alerts

---

## FAQ

### General Questions

**Q: I forgot my password. How do I reset it?**
A: Click "Forgot Password?" on the login page and follow the email instructions.

**Q: How often should I check the admin panel?**
A: At least once daily to review pending bookings and cancellation requests.

**Q: Can I access the admin panel from my phone?**
A: Yes, the interface is responsive, but we recommend using a desktop for complex tasks.

### Booking Questions

**Q: A customer says they didn't receive their e-ticket. What should I do?**
A: 
1. Open the booking details
2. Verify booking status is "Confirmed" and payment is "Completed"
3. Click "Resend E-Ticket" button
4. If still not received, check spam folder or try alternate email

**Q: Can I edit a booking after it's confirmed?**
A: No, bookings cannot be edited. If changes needed, cancel and create a new booking.

**Q: What if a booking was not synced with XS2Event?**
A: Click "Sync with XS2Event" button on booking details page. If it fails, contact XS2Event support.

### Refund Questions

**Q: How long do refunds take to process?**
A: Stripe refunds typically appear in customer's account within 5-10 business days.

**Q: Can I issue a partial refund?**
A: Yes, enter a refund amount less than the booking total when processing the refund.

**Q: What if a customer disputes a charge after refund?**
A: Contact Stripe support immediately with booking and refund details.

### Customer Questions

**Q: Should I block or suspend a customer?**
A: 
- **Block:** For serious issues (fraud, abuse) - permanent until unblocked
- **Suspend:** For temporary issues (payment problems, investigation)

**Q: Can customers see admin notes?**
A: No, admin notes are internal only and never displayed to customers.

**Q: How do I handle a complaint?**
A: Add a note to customer profile, resolve the issue, and document the resolution.

### Technical Questions

**Q: The page is loading slowly. What should I do?**
A: 
1. Clear your browser cache
2. Close unnecessary browser tabs
3. Check your internet connection
4. Contact support if issue persists

**Q: I'm getting an error message. What does it mean?**
A: Note the error message and contact technical support with:
- Exact error message
- What you were trying to do
- Screenshot if possible

**Q: Can I undo a change I made?**
A: Some actions can be reversed (e.g., unblock customer). Others cannot (e.g., delete). Always double-check before deleting.

### Reporting Questions

**Q: Why don't my report numbers match the dashboard?**
A: 
- Dashboard shows real-time data
- Reports use specified date ranges
- Check that date ranges match

**Q: Can I schedule reports to be sent automatically?**
A: Yes, if your system version includes this feature. Go to Reports → Scheduled Reports.

**Q: How do I export data for analysis in Excel?**
A: Use the "Export" button on any listing page, then choose Excel format.

---

## Getting Help

### In-App Help

- Look for (?) icons throughout the interface
- Hover for quick help tooltips
- Click for detailed help articles

### Contact Support

**For Technical Issues:**
- Email: support@yourdomain.com
- Include: Error message, screenshot, steps to reproduce

**For Account Issues:**
- Email: admin@yourdomain.com
- Include: Your email address, issue description

**For Urgent Issues:**
- Phone: [Your Support Phone]
- Available: [Your Support Hours]

### Training Resources

- **Video Tutorials:** [Link to video library]
- **Quick Start Guide:** [Link to PDF]
- **Knowledge Base:** [Link to help center]

---

**User Manual Version:** 1.0.0  
**Last Updated:** November 19, 2025  
**Maintained by:** Rondo Development Team

---

*Thank you for using Rondo Sports Admin Panel!*
