# Deployment Guide - Rondo Sports

**Version 1.0.0** | November 19, 2025

This guide provides step-by-step instructions for deploying the Rondo Sports application to a production server.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Server Requirements](#server-requirements)
4. [Database Deployment](#database-deployment)
5. [Backend API Deployment](#backend-api-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Admin Panel Deployment](#admin-panel-deployment)
8. [Web Server Configuration](#web-server-configuration)
9. [SSL/HTTPS Setup](#ssl-https-setup)
10. [Post-Deployment Tasks](#post-deployment-tasks)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

---

## Prerequisites

Before deploying to production, ensure you have:

- ✅ Access to a production web server (SSH/FTP)
- ✅ Domain name configured and pointing to your server
- ✅ SSL certificate (Let's Encrypt recommended)
- ✅ Production database credentials
- ✅ Production XS2Event API key
- ✅ Production Stripe API keys
- ✅ SMTP email server credentials
- ✅ FTP/SFTP client (FileZilla, WinSCP, or similar)
- ✅ SSH client (PuTTY for Windows, or built-in terminal)

---

## Pre-Deployment Checklist

### 1. Local Testing
- [ ] Test complete booking flow locally
- [ ] Verify payment processing with Stripe test mode
- [ ] Test admin panel functionality
- [ ] Check email notifications
- [ ] Test cancellation and refund workflows
- [ ] Verify reports and analytics
- [ ] Test on multiple browsers and devices

### 2. Production Accounts
- [ ] XS2Event production account and API key
- [ ] Stripe production account configured
- [ ] Production database created
- [ ] SMTP email service configured
- [ ] Domain DNS configured

### 3. Code Preparation
- [ ] Update all `.env` files with production values
- [ ] Build production versions of frontend and admin
- [ ] Remove development tools and debug code
- [ ] Review and update CORS settings
- [ ] Verify all API endpoints

---

## Server Requirements

### Minimum Specifications

**Web Server:**
- OS: Linux (Ubuntu 20.04+, CentOS 8+) or Windows Server 2016+
- CPU: 2+ cores
- RAM: 4GB minimum, 8GB recommended
- Storage: 20GB SSD minimum
- Bandwidth: Unmetered or generous allowance

**Software Stack:**
- **Web Server:** Apache 2.4+ or Nginx 1.18+
- **PHP:** 8.1 or 8.2 (with required extensions)
- **Database:** MySQL 8.0+ or MariaDB 10.6+
- **SSL:** Let's Encrypt or commercial certificate
- **Node.js:** 18+ (for building frontend, not required at runtime)

### Required PHP Extensions

```bash
php -m | grep -E 'pdo|pdo_mysql|mbstring|openssl|json|curl|gd|zip'
```

Required extensions:
- `pdo`
- `pdo_mysql`
- `mbstring`
- `openssl`
- `json`
- `curl`
- `gd` (for image processing)
- `zip`
- `xml`
- `intl`

### Install PHP Extensions (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install php8.1-cli php8.1-fpm php8.1-mysql php8.1-mbstring \
  php8.1-curl php8.1-gd php8.1-zip php8.1-xml php8.1-intl
```

---

## Database Deployment

### Step 1: Create Production Database

Connect to your MySQL server via SSH or phpMyAdmin:

```sql
CREATE DATABASE rondo_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Create Database User

```sql
CREATE USER 'rondo_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON rondo_production.* TO 'rondo_user'@'localhost';
FLUSH PRIVILEGES;
```

**Important:** Use a strong password (16+ characters, mixed case, numbers, symbols).

### Step 3: Import Database Schema

**Option A: Via phpMyAdmin**
1. Login to phpMyAdmin
2. Select `rondo_production` database
3. Click "Import" tab
4. Choose `rondo.sql` file from your project
5. Click "Go" to import

**Option B: Via Command Line (SSH)**

```bash
mysql -u rondo_user -p rondo_production < /path/to/rondo.sql
```

### Step 4: Verify Import

```sql
USE rondo_production;
SHOW TABLES;
```

You should see 20+ tables including `admin_users`, `customers`, `bookings`, etc.

### Step 5: Create Admin User (if not in SQL file)

```sql
INSERT INTO admin_users (email, password, first_name, last_name, role_id, status) 
VALUES (
  'admin@yourdomain.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  'Admin',
  'User',
  1,
  'active'
);
```

**Important:** Change the password immediately after first login.

---

## Backend API Deployment

### Step 1: Build Locally

Before uploading, ensure Composer dependencies are installed:

```powershell
cd api
composer install --no-dev --optimize-autoloader
```

The `--no-dev` flag excludes development dependencies, and `--optimize-autoloader` improves performance.

### Step 2: Prepare Production Environment File

Create `api/.env` with production values:

```env
# Application
APP_URL=https://api.yourdomain.com/
APP_ENV=production

# XS2Event API (PRODUCTION)
API_BASE_URL=https://api.xs2event.com
API_KEY=your_production_xs2event_api_key_here

# CORS (Update with your actual domains)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=86400

# Database (PRODUCTION)
DB_HOST=localhost
DB_NAME=rondo_production
DB_USER=rondo_user
DB_PASS=your_strong_database_password
DB_PORT=3306
DB_CHARSET=utf8mb4

# JWT Authentication (GENERATE NEW SECRET!)
JWT_SECRET=GENERATE_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARACTERS_LONG
JWT_ACCESS_EXPIRY=3600
JWT_REFRESH_EXPIRY=86400

# Authentication
AUTH_MAX_LOGIN_ATTEMPTS=5
AUTH_LOCKOUT_DURATION=900
AUTH_PASSWORD_MIN_LENGTH=8

# Stripe (PRODUCTION KEYS)
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Email (PRODUCTION SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Rondo Sports

# Logging
LOG_LEVEL=warning
LOG_FILE=logs/app.log
```

**Critical Security Steps:**

1. **Generate secure JWT_SECRET:**
   ```powershell
   # PowerShell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
   ```

2. **Never commit `.env` to version control**

3. **Use production Stripe keys** (start with `sk_live_` and `pk_live_`)

### Step 3: Upload Files to Server

**Via FTP/SFTP:**

1. Connect to your server using FTP client
2. Navigate to your web directory (e.g., `/var/www/api.yourdomain.com/` or `public_html/api/`)
3. Upload the entire `api/` folder contents
4. Ensure the `.env` file is uploaded (FTP clients may hide dotfiles by default)

**Via SSH (recommended for faster transfer):**

```bash
# From your local machine
scp -r api/ user@yourserver.com:/var/www/api.yourdomain.com/

# Then SSH into server
ssh user@yourserver.com
```

### Step 4: Set File Permissions

```bash
cd /var/www/api.yourdomain.com

# Set proper ownership (assuming www-data is your web server user)
sudo chown -R www-data:www-data .

# Set directory permissions
sudo find . -type d -exec chmod 755 {} \;

# Set file permissions
sudo find . -type f -exec chmod 644 {} \;

# Make logs directory writable
sudo chmod 775 logs/
sudo chmod 664 logs/*.log

# Protect .env file
sudo chmod 600 .env
```

### Step 5: Verify API

Visit: `https://api.yourdomain.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T12:00:00Z"
}
```

---

## Frontend Deployment

### Step 1: Build Production Version

```powershell
cd frontend
```

1. **Update `.env` for production:**

```env
VITE_XS2EVENT_BASE_URL=https://api.yourdomain.com
VITE_XS2EVENT_API_KEY=your_production_xs2event_api_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key
VITE_WHATSAPP_NUMBER=1234567890
```

2. **Build:**

```powershell
npm run build
```

This creates a `dist/` folder with optimized production files.

### Step 2: Upload to Server

**Via FTP/SFTP:**

1. Upload contents of `frontend/dist/` folder to your web root
2. Typical paths:
   - cPanel: `public_html/`
   - Plesk: `httpdocs/`
   - Custom: `/var/www/yourdomain.com/public/`

**Via SSH:**

```bash
# Upload dist folder
scp -r frontend/dist/* user@yourserver.com:/var/www/yourdomain.com/public/
```

### Step 3: Configure URL Rewriting

For React Router to work with clean URLs, create `.htaccess` (Apache) or configure Nginx.

**Apache (.htaccess in frontend root):**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx (in server block):**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Step 4: Verify Deployment

Visit: `https://yourdomain.com`

Check:
- [ ] Homepage loads
- [ ] Navigation works
- [ ] API calls succeed (check browser console)
- [ ] Images load correctly

---

## Admin Panel Deployment

### Step 1: Build Production Version

```powershell
cd admin
```

1. **Update `.env`:**

```env
VITE_API_URL=https://api.yourdomain.com
```

2. **Build:**

```powershell
npm run build
```

### Step 2: Upload to Server

Upload contents of `admin/dist/` to subdomain or subdirectory:

**Option A: Subdomain (recommended)**
- Upload to: `/var/www/admin.yourdomain.com/public/`
- Access via: `https://admin.yourdomain.com`

**Option B: Subdirectory**
- Upload to: `/var/www/yourdomain.com/public/admin/`
- Access via: `https://yourdomain.com/admin`

### Step 3: Configure URL Rewriting

Same as frontend - add `.htaccess` or Nginx configuration.

### Step 4: Verify Admin Panel

Visit: `https://admin.yourdomain.com`

Test:
- [ ] Login page loads
- [ ] Can login with admin credentials
- [ ] Dashboard displays data
- [ ] All pages accessible

---

## Web Server Configuration

### Apache Configuration

**Virtual Host for API:**

```apache
<VirtualHost *:80>
    ServerName api.yourdomain.com
    DocumentRoot /var/www/api.yourdomain.com/public
    
    <Directory /var/www/api.yourdomain.com/public>
        AllowOverride All
        Require all granted
        
        # Enable URL rewriting
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.php [QSA,L]
    </Directory>
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/api-error.log
    CustomLog ${APACHE_LOG_DIR}/api-access.log combined
</VirtualHost>
```

**Virtual Host for Frontend:**

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    DocumentRoot /var/www/yourdomain.com/public
    
    <Directory /var/www/yourdomain.com/public>
        AllowOverride All
        Require all granted
        Options -Indexes +FollowSymLinks
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/frontend-access.log combined
</VirtualHost>
```

**Enable required modules:**

```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl
sudo systemctl restart apache2
```

### Nginx Configuration

**API Server Block:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/api.yourdomain.com/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\. {
        deny all;
    }
}
```

**Frontend Server Block:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/yourdomain.com/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free, Recommended)

**Install Certbot:**

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-apache  # For Apache
# OR
sudo apt install certbot python3-certbot-nginx   # For Nginx
```

**Generate Certificates:**

```bash
# For Apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
sudo certbot --apache -d api.yourdomain.com
sudo certbot --apache -d admin.yourdomain.com

# For Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d admin.yourdomain.com
```

**Auto-renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job for renewal
```

### Manual SSL Certificate

If using a commercial SSL certificate:

1. Generate CSR on server
2. Submit to Certificate Authority
3. Download certificate files
4. Configure in Apache/Nginx

**Apache SSL Configuration:**

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/yourdomain.com/public
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/yourdomain.com.crt
    SSLCertificateKeyFile /etc/ssl/private/yourdomain.com.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt
    
    # ... rest of configuration
</VirtualHost>
```

### Force HTTPS Redirect

**Apache (.htaccess):**

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

**Nginx:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Post-Deployment Tasks

### 1. Stripe Webhook Configuration

1. Login to Stripe Dashboard
2. Go to: Developers → Webhooks
3. Add endpoint: `https://api.yourdomain.com/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy webhook signing secret to API `.env` (`STRIPE_WEBHOOK_SECRET`)

### 2. Test Complete Workflow

- [ ] Register new customer account
- [ ] Browse events and add tickets to cart
- [ ] Complete checkout with test card
- [ ] Verify booking appears in admin panel
- [ ] Check email notifications received
- [ ] Test cancellation request flow
- [ ] Process refund from admin panel
- [ ] Verify refund in Stripe dashboard

### 3. Configure Backups

**Database Backup Script:**

```bash
#!/bin/bash
# /home/user/scripts/backup-db.sh

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/home/user/backups"
DB_NAME="rondo_production"
DB_USER="rondo_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/rondo-$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "rondo-*.sql.gz" -mtime +30 -delete
```

**Schedule Daily Backup (cron):**

```bash
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * /home/user/scripts/backup-db.sh
```

### 4. Monitor Logs

**View API Logs:**

```bash
tail -f /var/www/api.yourdomain.com/logs/app.log
```

**View Apache/Nginx Logs:**

```bash
tail -f /var/log/apache2/api-error.log
tail -f /var/log/nginx/error.log
```

### 5. Performance Optimization

**Enable PHP OPcache:**

Edit `/etc/php/8.1/fpm/php.ini`:

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
```

**Enable Gzip Compression (Apache):**

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

**Browser Caching (Apache):**

```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### 6. Security Hardening

**Disable Directory Listing:**

```apache
Options -Indexes
```

**Protect .env File:**

```apache
<Files .env>
  Order allow,deny
  Deny from all
</Files>
```

**Set Security Headers:**

```apache
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

---

## Troubleshooting

### Issue: 500 Internal Server Error

**Check:**
1. PHP error logs: `tail -f /var/log/apache2/error.log`
2. API logs: `cat api/logs/app.log`
3. File permissions: `ls -la api/`
4. `.htaccess` syntax
5. PHP extensions installed

### Issue: Database Connection Failed

**Check:**
1. Database credentials in `.env`
2. Database user permissions
3. MySQL service running: `systemctl status mysql`
4. Firewall rules if database is remote

### Issue: CORS Errors

**Check:**
1. `CORS_ALLOWED_ORIGINS` in API `.env`
2. Include frontend and admin URLs
3. No trailing slashes
4. Protocol matches (https vs http)

### Issue: Stripe Payments Failing

**Check:**
1. Using production keys (`sk_live_`, `pk_live_`)
2. Webhook endpoint configured correctly
3. Webhook secret in `.env`
4. API accessible from Stripe servers (no IP restrictions)

### Issue: Emails Not Sending

**Check:**
1. SMTP credentials in `.env`
2. SMTP port not blocked by firewall
3. Test email send: Use PHP mail() test script
4. Check email logs: `api/logs/app.log`

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check backup completion
- Review dashboard metrics

**Weekly:**
- Review activity logs for suspicious behavior
- Check disk space usage
- Verify backup integrity (restore test)

**Monthly:**
- Update PHP and system packages
- Review and archive old logs
- Update Composer dependencies (after testing)
- Review user accounts and roles

### Updating the Application

**For Minor Updates (e.g., v1.0.1 → v1.0.2):**

1. Backup database and files
2. Download new version zip
3. Replace files (preserve `.env`)
4. Clear cache if applicable
5. Test functionality

**For Major Updates (e.g., v1.0.0 → v2.0.0):**

1. Full backup (database + files)
2. Review CHANGELOG.md for breaking changes
3. Test on staging environment first
4. Run database migrations if provided
5. Update `.env` with new variables
6. Deploy to production
7. Monitor closely for 24-48 hours

### Rollback Procedure

If deployment fails:

1. Restore database from backup
2. Restore previous version files
3. Clear cache
4. Restart web server
5. Verify functionality

```bash
# Restore database
mysql -u rondo_user -p rondo_production < backup-2025-11-19.sql

# Restore files
rm -rf /var/www/api.yourdomain.com/*
cp -r /backup/api-2025-11-19/* /var/www/api.yourdomain.com/
```

---

## Performance Benchmarks

**Expected Performance (properly configured server):**

- Homepage load: < 2 seconds
- API response time: < 200ms
- Database queries: < 50ms
- Booking creation: < 500ms
- Admin dashboard: < 3 seconds

If performance degrades, check:
- Server resources (CPU, RAM, disk)
- Database query optimization
- CDN for static assets
- Caching implementation

---

## Support Checklist

Before contacting support, gather:

- [ ] Server details (OS, PHP version, web server)
- [ ] Error logs (last 50 lines)
- [ ] Steps to reproduce issue
- [ ] Expected vs actual behavior
- [ ] Recent changes made
- [ ] Screenshot of error (if applicable)

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** November 19, 2025  
**Maintained by:** Rondo Development Team
