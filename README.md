# Rondo Sports - Sports Ticket Booking System

**Version 1.0.0** | November 19, 2025

A complete sports ticket booking platform with customer-facing frontend, administrative dashboard, and REST API backend. The system integrates with XS2Event API for real-time sports data and provides comprehensive ticket management, payment processing via Stripe, and customer management capabilities.

---

## 📋 Project Overview

Rondo Sports is a three-tier web application for sports event ticket booking:

### 1. **Customer Frontend** (`frontend/`)
   - Public-facing React application for browsing events and booking tickets
   - Sports → Tournaments → Events → Tickets hierarchy
   - Integrated Stripe payment processing
   - Customer account management with booking history
   - Real-time ticket availability and seat selection
   - Responsive design for mobile and desktop

### 2. **Admin Panel** (`admin/`)
   - Administrative dashboard for managing the platform
   - Booking management (view, confirm, cancel, refund)
   - Customer management with detailed profiles
   - Content management (static pages, banners)
   - Reports and analytics with interactive charts
   - Role-based access control (RBAC)
   - Team credentials and XS2Event synchronization

### 3. **Backend API** (`api/`)
   - PHP REST API built with Slim Framework
   - Proxy to XS2Event API for sports data
   - JWT-based authentication for both admin and customers
   - MySQL database for local data management
   - Stripe payment integration
   - Email notifications (booking confirmations, cancellations)
   - Comprehensive activity logging

---

## 🚀 Quick Start Guide

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) and npm
- **PHP** (v8.1 or higher)
- **Composer** (PHP package manager)
- **MySQL** or **MariaDB** (v10.4 or higher)
- **Web Server** (Apache or Nginx with PHP support)
- A text editor or IDE (VS Code, PhpStorm, etc.)

### Step 1: Extract the Project

Unzip the `Rondo-Sports-v1.0.zip` file to your desired location.

```
Rondo-Development/
├── frontend/          # Customer-facing application
├── admin/            # Administrative dashboard
├── api/              # Backend REST API
├── docs/             # Additional documentation
├── README.md         # This file
├── CHANGELOG.md      # Version history
├── DEPLOYMENT.md     # Deployment guide
└── rondo.sql         # Database schema
```

### Step 2: Database Setup

1. **Create Database**
   ```sql
   CREATE DATABASE rondo_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Import Schema**
   - Open phpMyAdmin or your preferred MySQL client
   - Select the `rondo_admin` database
   - Import the `rondo.sql` file from the root directory
   - This will create all necessary tables and sample data

3. **Verify Tables**
   - Ensure tables are created: `admin_users`, `customers`, `bookings`, `refund_requests`, etc.
   - Check that sample admin user exists (username: `admin@rondo.com`)

### Step 3: Backend API Setup

1. **Navigate to API folder**
   ```powershell
   cd api
   ```

2. **Install PHP Dependencies**
   ```powershell
   composer install
   ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Edit `.env` and configure:
     ```env
     # Application URL
     APP_URL=http://rondoapi.local/

     # XS2Event API
     API_BASE_URL=https://testapi.xs2event.com
     API_KEY=your_xs2event_api_key_here

     # Database
     DB_HOST=localhost
     DB_NAME=rondo_admin
     DB_USER=root
     DB_PASS=your_password
     DB_PORT=3306

     # JWT Authentication
     JWT_SECRET=change-this-to-a-secure-random-string-in-production

     # Stripe (for payments)
     STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

     # Email Configuration
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=your-app-password
     ```

4. **Setup Web Server**
   - For Apache: Ensure `mod_rewrite` is enabled
   - Point document root to `api/public/` directory
   - `.htaccess` file is already configured
   
   **Example Apache Virtual Host:**
   ```apache
   <VirtualHost *:80>
       ServerName rondoapi.local
       DocumentRoot "C:/path/to/Rondo-Development/api/public"
       
       <Directory "C:/path/to/Rondo-Development/api/public">
           Options Indexes FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

5. **Update hosts file** (Windows: `C:\Windows\System32\drivers\etc\hosts`)
   ```
   127.0.0.1 rondoapi.local
   ```

6. **Test API**
   - Visit: `http://rondoapi.local/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

### Step 4: Customer Frontend Setup

1. **Navigate to frontend folder**
   ```powershell
   cd frontend
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Edit `.env`:
     ```env
     # API Base URL
     VITE_XS2EVENT_BASE_URL=http://rondoapi.local

     # XS2Event API Key (same as backend)
     VITE_XS2EVENT_API_KEY=your_xs2event_api_key_here

     # Stripe Publishable Key
     VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

     # WhatsApp Support Number
     VITE_WHATSAPP_NUMBER=1234567890
     ```

4. **Start Development Server**
   ```powershell
   npm run dev
   ```
   - Application will run on: `http://localhost:5173`
   - Hot module replacement (HMR) enabled for development

5. **Build for Production**
   ```powershell
   npm run build
   ```
   - Production files will be in `dist/` folder

### Step 5: Admin Panel Setup

1. **Navigate to admin folder**
   ```powershell
   cd admin
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Configure Environment**
   - Copy `.env` or create new:
     ```env
     # API URL (points to backend)
     VITE_API_URL=http://rondoapi.local
     ```

4. **Start Development Server**
   ```powershell
   npm run dev
   ```
   - Application will run on: `http://localhost:5174`

5. **Build for Production**
   ```powershell
   npm run build
   ```
   - Production files will be in `dist/` folder

### Step 6: Login to Admin Panel

1. Open browser and navigate to: `http://localhost:5174`
2. **Default Admin Credentials:**
   - **Email:** `admin@rondo.com`
   - **Password:** `admin123` (or check database for actual password)
3. After login, you can:
   - View dashboard with booking statistics
   - Manage bookings, customers, and refunds
   - Configure content and banners
   - View reports and analytics

---

## 🏗️ Architecture Overview

### Technology Stack

**Frontend (Customer & Admin):**
- React 19.1.0 + TypeScript 5.8.3
- Vite 6.3.5 (build tool with HMR)
- React Router DOM 7.x (routing)
- CSS Modules (styling)
- Recharts (admin analytics)
- Stripe React (payment integration)

**Backend API:**
- PHP 8.1+
- Slim Framework 4.11 (REST API)
- Guzzle HTTP Client (XS2Event proxy)
- Firebase JWT (authentication)
- Stripe PHP SDK (payments)
- Monolog (logging)
- PHPMailer (email)

**Database:**
- MySQL 8.0 / MariaDB 10.4+
- Character Set: utf8mb4
- InnoDB storage engine
- Foreign key constraints enabled

### Data Flow

```
Customer Frontend → Backend API → XS2Event API (sports data)
                   ↓
                 MySQL DB (bookings, customers, admin data)
                   ↓
                 Stripe API (payment processing)
```

### Key Features

✅ **Customer Features:**
- Browse sports, tournaments, and events
- View seat maps and ticket availability
- Add tickets to cart with quantity selection
- Secure checkout with Stripe
- User registration and login
- View booking history and e-tickets
- Request cancellations with reasons
- Download/print e-tickets

✅ **Admin Features:**
- Dashboard with key metrics and trends
- Booking management (view, confirm, cancel, refund)
- Customer management (view, edit, block/unblock)
- Cancellation request handling (approve/decline)
- Refund processing with Stripe integration
- Content management (static pages, banners)
- Team credentials for XS2Event sync
- Role-based access control
- Activity logs and audit trails
- Reports with date filtering and charts

✅ **Backend Features:**
- RESTful API with JSON responses
- JWT-based authentication (admin + customer)
- XS2Event API proxy with caching
- Stripe payment and refund processing
- Email notifications (booking, cancellation)
- Database migrations
- Comprehensive error handling
- CORS support for frontend apps
- Rate limiting and security

---

## 📁 Directory Structure

### Frontend (`frontend/`)
```
frontend/
├── public/               # Static assets
│   └── images/          # Event images, icons, partners
├── src/
│   ├── components/      # React components
│   │   ├── home/       # Homepage components
│   │   ├── layout/     # Header, Footer
│   │   ├── auth/       # Login, Register forms
│   │   └── payment/    # Stripe checkout components
│   ├── hooks/          # Custom React hooks (useEvents, useBooking, etc.)
│   ├── pages/          # Page components (AllSportsPage, EventsPage, etc.)
│   ├── services/       # API client services
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── .env                # Environment configuration
├── package.json        # Node dependencies
└── vite.config.ts      # Vite build configuration
```

### Admin Panel (`admin/`)
```
admin/
├── public/
│   └── assets/images/
├── src/
│   ├── components/     # UI components (Table, Card, Modal, etc.)
│   ├── contexts/       # React contexts (AuthContext, ThemeContext)
│   ├── layouts/        # Dashboard layout
│   ├── pages/          # Admin pages (Dashboard, Bookings, Reports, etc.)
│   ├── services/       # API services (dashboardService, booking-service, etc.)
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Helper functions
├── .env                # Environment configuration
└── package.json        # Node dependencies
```

### Backend API (`api/`)
```
api/
├── bin/                # CLI utility scripts
│   ├── migrate.php    # Database migration tool
│   └── setup-db.php   # Database setup script
├── config/             # Configuration files
│   ├── auth.php       # Authentication config
│   └── container.php  # Dependency injection
├── logs/              # Application logs
├── migrations/        # Database migration files
├── public/            # Web-accessible directory
│   ├── .htaccess     # Apache rewrite rules
│   └── index.php     # Application entry point
├── src/
│   ├── Controller/    # API endpoint controllers
│   ├── Middleware/    # Request middleware (Auth, CORS, Logging)
│   ├── Repository/    # Database access layer
│   ├── Service/       # Business logic services
│   ├── Exception/     # Custom exceptions
│   └── Application.php # Main application class
├── vendor/            # Composer dependencies
├── .env              # Environment configuration
└── composer.json     # PHP dependencies
```

---

## 🔐 Security Considerations

### Authentication
- JWT tokens with expiration (1 hour access, 24 hour refresh)
- Secure password hashing (bcrypt)
- Login attempt limiting (5 attempts, 15-minute lockout)
- Separate authentication for admin and customers

### Authorization
- Role-based access control (RBAC) for admin users
- Permission-based endpoint access
- Customer data isolation (users can only access their own data)

### Data Protection
- SQL injection prevention (prepared statements)
- XSS protection (input sanitization, output encoding)
- CSRF protection considerations
- Secure session management
- Environment variables for sensitive data

### Best Practices
- HTTPS required in production
- Secure headers (CORS, CSP)
- Regular dependency updates
- Database backups
- Activity logging for audit trails

---

## 🧪 Testing

### Frontend Testing
```powershell
cd frontend
npm run lint        # Check code quality
```

### Backend Testing
```powershell
cd api
composer test       # Run PHPUnit tests (if configured)
composer phpstan    # Static analysis
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Frontend cannot connect to API
- **Solution:** Verify `VITE_XS2EVENT_BASE_URL` in frontend `.env` matches API URL
- Check API is running: `http://rondoapi.local/health`
- Ensure CORS is configured in API `.env`

**Issue:** Database connection error
- **Solution:** Verify database credentials in `api/.env`
- Check MySQL service is running
- Ensure database exists and schema is imported

**Issue:** Stripe payments not working
- **Solution:** Verify Stripe keys in both frontend and backend `.env`
- Check Stripe account is in test mode for development
- Ensure webhook endpoint is configured in Stripe dashboard

**Issue:** Admin login fails
- **Solution:** Check admin user exists in database
- Reset password using: `php bin/reset-password.php admin@rondo.com`
- Verify JWT_SECRET is set in `api/.env`

**Issue:** XS2Event API errors
- **Solution:** Verify API key in `.env` files
- Check XS2Event API URL (testapi vs production)
- Review API logs: `api/logs/app.log`

---

## 📚 Additional Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API endpoints and usage
- **[USER_MANUAL.md](./USER_MANUAL.md)** - Admin panel user guide
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Development guide and architecture

---

## 🤝 Support

For technical support or questions:
- Review documentation in `docs/` folder
- Check API logs in `api/logs/`
- Review browser console for frontend errors
- Contact development team with error details

---

## 📝 License

Proprietary software. All rights reserved.

---

## 🎯 Next Steps

After completing the setup:

1. **Test the complete flow:**
   - Browse events on customer frontend
   - Add tickets to cart and complete checkout
   - Login to admin panel and view the booking
   - Process a refund from admin panel

2. **Customize content:**
   - Update static pages (About Us, Terms, Privacy)
   - Upload banners for homepage
   - Configure team credentials for XS2Event sync

3. **Production deployment:**
   - Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
   - Configure production Stripe keys
   - Enable HTTPS/SSL certificates
   - Set up regular database backups
   - Configure email SMTP for production

4. **Monitor and maintain:**
   - Review activity logs regularly
   - Monitor booking trends on dashboard
   - Keep dependencies updated
   - Back up database regularly

---

**Developed by:** Rondo Development Team  
**Version:** 1.0.0  
**Last Updated:** November 19, 2025
