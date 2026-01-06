# Developer Guide - Rondo Sports

**Version 1.0.0** | November 19, 2025

Technical documentation for developers working on the Rondo Sports platform.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Frontend Development](#frontend-development)
4. [Backend Development](#backend-development)
5. [Database Guidelines](#database-guidelines)
6. [API Integration](#api-integration)
7. [Authentication & Authorization](#authentication--authorization)
8. [Testing](#testing)
9. [Coding Standards](#coding-standards)
10. [Git Workflow](#git-workflow)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
├──────────────────────┬──────────────────────────────────┤
│  Customer Frontend   │      Admin Panel                 │
│  (React + Vite)      │   (React + Vite)                 │
│  Port: 5173          │   Port: 5174                     │
└──────────────┬───────┴──────────┬───────────────────────┘
               │                  │
               │ HTTP/HTTPS       │
               │ REST + JSON      │
               ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (PHP + Slim)                    │
│              Port: 80/443                                │
├──────────────────────┬──────────────────────────────────┤
│  Controllers         │  Middleware                       │
│  Services            │  - Authentication                 │
│  Repositories        │  - CORS                           │
│                      │  - Logging                        │
└──────────────┬───────┴──────────┬───────────────────────┘
               │                  │
               │                  │
               ▼                  ▼
┌──────────────────────┐  ┌─────────────────────────┐
│   MySQL Database     │  │    XS2Event API         │
│   (Local Data)       │  │  (Sports Data Provider) │
└──────────────────────┘  └─────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                    External Services                      │
├──────────────────────┬───────────────────────────────────┤
│   Stripe API         │   Email Service (SMTP)            │
│   (Payments)         │   (Notifications)                 │
└──────────────────────┴───────────────────────────────────┘
```

### Technology Stack

**Frontend (Customer & Admin):**
- **Framework:** React 19.1.0
- **Language:** TypeScript 5.8.3
- **Build Tool:** Vite 6.3.5
- **Routing:** React Router DOM 7.x
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Styling:** CSS Modules
- **HTTP Client:** Fetch API
- **Charts:** Recharts (admin only)
- **Payments:** Stripe React Elements
- **Form Validation:** Custom validators
- **Dev Server:** Vite Dev Server with HMR

**Backend API:**
- **Language:** PHP 8.1+
- **Framework:** Slim Framework 4.11
- **Database:** PDO with MySQL/MariaDB
- **HTTP Client:** Guzzle 7.5
- **Authentication:** Firebase JWT 6.0
- **Payments:** Stripe PHP SDK 18.0
- **Email:** PHPMailer 6.8
- **Logging:** Monolog 3.3
- **Dependency Injection:** PSR-11 Container
- **Standards:** PSR-7 (HTTP Messages), PSR-15 (Middleware)

**Database:**
- **DBMS:** MySQL 8.0 / MariaDB 10.6+
- **Character Set:** utf8mb4
- **Collation:** utf8mb4_unicode_ci
- **Storage Engine:** InnoDB
- **Schema Management:** Manual migrations

**Development Tools:**
- **Package Managers:** npm (frontend), Composer (backend)
- **Linting:** ESLint (frontend), PHP_CodeSniffer (backend)
- **Type Checking:** TypeScript, PHP strict types
- **API Testing:** Postman
- **Version Control:** Git (optional - not included in delivery)

### Design Patterns

**Backend:**
- **Repository Pattern:** Data access abstraction
- **Service Layer:** Business logic separation
- **Dependency Injection:** Loose coupling
- **Middleware Pipeline:** Request/response processing
- **Factory Pattern:** Object creation
- **Strategy Pattern:** Payment processing, refunds

**Frontend:**
- **Component-Based:** Reusable UI components
- **Custom Hooks:** Shared logic encapsulation
- **Context API:** Global state (auth, theme)
- **Compound Components:** Complex UI patterns
- **Higher-Order Components:** Behavior composition

---

## Development Environment Setup

### Prerequisites

Install the following on your development machine:

- **Node.js:** v18+ ([nodejs.org](https://nodejs.org))
- **npm:** Comes with Node.js
- **PHP:** v8.1+ ([php.net](https://php.net))
- **Composer:** ([getcomposer.org](https://getcomposer.org))
- **MySQL/MariaDB:** v8.0+ / v10.6+
- **Git:** (optional) ([git-scm.com](https://git-scm.com))
- **VS Code:** (recommended) ([code.visualstudio.com](https://code.visualstudio.com))

### VS Code Extensions (Recommended)

- **PHP Intelephense** - PHP language support
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **PHP Debug** - PHP debugging with Xdebug
- **Thunder Client** - API testing
- **GitLens** - Git integration (if using Git)
- **MySQL** - Database management
- **Path Intellisense** - File path autocomplete

### Local Development Setup

**1. Database Setup:**

```sql
CREATE DATABASE rondo_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rondo_dev'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON rondo_dev.* TO 'rondo_dev'@'localhost';
FLUSH PRIVILEGES;
```

Import schema:
```bash
mysql -u rondo_dev -p rondo_dev < rondo.sql
```

**2. Backend Setup:**

```bash
cd api
composer install
cp .env.example .env
```

Edit `.env`:
```env
APP_URL=http://rondoapi.local/
DB_HOST=localhost
DB_NAME=rondo_dev
DB_USER=rondo_dev
DB_PASS=dev_password
JWT_SECRET=your-dev-jwt-secret-key-here
```

**3. Frontend Setup:**

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_XS2EVENT_BASE_URL=http://rondoapi.local
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
```

Start dev server:
```bash
npm run dev
```

**4. Admin Setup:**

```bash
cd admin
npm install
```

Create `.env`:
```env
VITE_API_URL=http://rondoapi.local
```

Start dev server:
```bash
npm run dev
```

### Virtual Host Configuration

**Apache:**

Create `C:\Windows\System32\drivers\etc\hosts` entry:
```
127.0.0.1 rondoapi.local
```

Create virtual host (`httpd-vhosts.conf`):
```apache
<VirtualHost *:80>
    ServerName rondoapi.local
    DocumentRoot "C:/path/to/Rondo-Development/api/public"
    
    <Directory "C:/path/to/Rondo-Development/api/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Nginx:**

```nginx
server {
    listen 80;
    server_name rondoapi.local;
    root /path/to/Rondo-Development/api/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

## Frontend Development

### Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── home/            # Homepage components
│   │   ├── layout/          # Header, Footer
│   │   ├── auth/            # Login, Register forms
│   │   └── payment/         # Stripe checkout
│   ├── hooks/               # Custom React hooks
│   │   ├── useEvents.ts     # Fetch events data
│   │   ├── useBooking.ts    # Booking operations
│   │   └── useAuth.ts       # Authentication
│   ├── pages/               # Page components (routed)
│   │   ├── HomePage.tsx
│   │   ├── EventsPage.tsx
│   │   └── CheckoutPage.tsx
│   ├── services/            # API client services
│   │   ├── api-client.ts    # Base HTTP client
│   │   └── xs2event.ts      # XS2Event API wrapper
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Helper functions
│   ├── App.tsx              # Root component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── .env                     # Environment variables
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

### Creating a New Component

**1. Create component file:**

```tsx
// src/components/EventCard/EventCard.tsx
import React from 'react';
import styles from './EventCard.module.css';

interface EventCardProps {
  eventId: number;
  eventName: string;
  eventDate: string;
  venueName: string;
  price: number;
  imageUrl?: string;
  onBookClick?: (eventId: number) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  eventId,
  eventName,
  eventDate,
  venueName,
  price,
  imageUrl,
  onBookClick
}) => {
  const handleClick = () => {
    if (onBookClick) {
      onBookClick(eventId);
    }
  };

  return (
    <div className={styles.eventCard}>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={eventName} 
          className={styles.eventImage} 
        />
      )}
      <div className={styles.eventContent}>
        <h3 className={styles.eventName}>{eventName}</h3>
        <p className={styles.eventDate}>{new Date(eventDate).toLocaleDateString()}</p>
        <p className={styles.eventVenue}>{venueName}</p>
        <div className={styles.eventFooter}>
          <span className={styles.eventPrice}>${price.toFixed(2)}</span>
          <button 
            className={styles.bookButton} 
            onClick={handleClick}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};
```

**2. Create CSS Module:**

```css
/* src/components/EventCard/EventCard.module.css */
.eventCard {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  background: white;
}

.eventCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.eventImage {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.eventContent {
  padding: 16px;
}

.eventName {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.eventDate,
.eventVenue {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.eventFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.eventPrice {
  font-size: 20px;
  font-weight: 700;
  color: #e74c3c;
}

.bookButton {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.bookButton:hover {
  background-color: #2980b9;
}
```

**3. Export component:**

```tsx
// src/components/EventCard/index.ts
export { EventCard } from './EventCard';
```

**4. Use component:**

```tsx
import { EventCard } from '@/components/EventCard';

function EventsPage() {
  const handleBookClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div className="events-grid">
      {events.map(event => (
        <EventCard
          key={event.id}
          eventId={event.id}
          eventName={event.name}
          eventDate={event.date}
          venueName={event.venue}
          price={event.price}
          imageUrl={event.image}
          onBookClick={handleBookClick}
        />
      ))}
    </div>
  );
}
```

### Creating a Custom Hook

**Example: useBooking hook**

```tsx
// src/hooks/useBooking.ts
import { useState, useCallback } from 'react';
import { bookingService } from '@/services/booking-service';

interface BookingData {
  eventId: number;
  categoryId: number;
  tickets: Array<{
    guestName: string;
    guestEmail: string;
    seatNumber: string;
  }>;
}

interface BookingResult {
  bookingId: string;
  success: boolean;
  error?: string;
}

export const useBooking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCallback(async (data: BookingData): Promise<BookingResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await bookingService.createBooking(data);
      
      if (response.success) {
        return {
          bookingId: response.data.booking_id,
          success: true
        };
      } else {
        setError(response.error?.message || 'Booking failed');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getBooking = useCallback(async (bookingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await bookingService.getBooking(bookingId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch booking';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createBooking,
    getBooking,
    isLoading,
    error
  };
};
```

**Usage:**

```tsx
import { useBooking } from '@/hooks/useBooking';

function CheckoutPage() {
  const { createBooking, isLoading, error } = useBooking();

  const handleCheckout = async () => {
    const result = await createBooking({
      eventId: 123,
      categoryId: 45,
      tickets: [
        { guestName: 'John Doe', guestEmail: 'john@example.com', seatNumber: 'A12' }
      ]
    });

    if (result?.success) {
      navigate(`/booking-confirmation/${result.bookingId}`);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleCheckout} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Complete Booking'}
      </button>
    </div>
  );
}
```

### API Service Pattern

```tsx
// src/services/api-client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://rondoapi.local';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Similar for PUT, DELETE, etc.
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### State Management with Context

```tsx
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and validate
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/v1/customers/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/customers/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.access_token);
      setUser(data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Build for Production

```bash
npm run build
```

Output in `dist/` folder, ready for deployment.

---

## Backend Development

### Project Structure

```
api/
├── src/
│   ├── Controller/          # HTTP request handlers
│   ├── Service/             # Business logic
│   ├── Repository/          # Database access
│   ├── Middleware/          # Request/response processing
│   ├── Exception/           # Custom exceptions
│   ├── Config/              # Configuration classes
│   └── Application.php      # Main application setup
├── public/
│   ├── index.php           # Entry point
│   └── .htaccess           # Apache rewrite rules
├── config/                  # Configuration files
├── migrations/              # Database migrations
├── logs/                    # Application logs
├── tests/                   # Unit and integration tests
├── vendor/                  # Composer dependencies
├── composer.json            # PHP dependencies
└── .env                     # Environment configuration
```

### Creating a New Controller

```php
<?php
// src/Controller/ExampleController.php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Service\ExampleService;

class ExampleController
{
    private LoggerInterface $logger;
    private ExampleService $exampleService;

    public function __construct(
        ExampleService $exampleService,
        LoggerInterface $logger
    ) {
        $this->exampleService = $exampleService;
        $this->logger = $logger;
    }

    public function getExamples(Request $request, Response $response): Response
    {
        try {
            // Get query parameters
            $params = $request->getQueryParams();
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);

            // Call service
            $data = $this->exampleService->getExamples($page, $limit);

            // Build response
            $responseData = [
                'success' => true,
                'data' => $data
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(200);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get examples', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $errorResponse = [
                'success' => false,
                'error' => [
                    'code' => 'INTERNAL_ERROR',
                    'message' => 'Failed to retrieve examples'
                ]
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(500);
        }
    }

    public function createExample(Request $request, Response $response): Response
    {
        try {
            // Parse JSON body
            $body = json_decode((string)$request->getBody(), true);

            // Validate input
            if (empty($body['name'])) {
                throw new \InvalidArgumentException('Name is required');
            }

            // Create resource
            $example = $this->exampleService->createExample($body);

            $responseData = [
                'success' => true,
                'data' => $example,
                'message' => 'Example created successfully'
            ];

            $response->getBody()->write(json_encode($responseData));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(201);

        } catch (\InvalidArgumentException $e) {
            $errorResponse = [
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => $e->getMessage()
                ]
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(422);

        } catch (\Exception $e) {
            $this->logger->error('Failed to create example', [
                'error' => $e->getMessage()
            ]);

            $errorResponse = [
                'success' => false,
                'error' => [
                    'code' => 'INTERNAL_ERROR',
                    'message' => 'Failed to create example'
                ]
            ];

            $response->getBody()->write(json_encode($errorResponse));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(500);
        }
    }
}
```

### Creating a Service

```php
<?php
// src/Service/ExampleService.php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\ExampleRepository;

class ExampleService
{
    private ExampleRepository $repository;
    private LoggerInterface $logger;

    public function __construct(
        ExampleRepository $repository,
        LoggerInterface $logger
    ) {
        $this->repository = $repository;
        $this->logger = $logger;
    }

    public function getExamples(int $page = 1, int $limit = 20): array
    {
        $offset = ($page - 1) * $limit;
        
        $examples = $this->repository->findAll($limit, $offset);
        $total = $this->repository->count();

        return [
            'examples' => $examples,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => (int)ceil($total / $limit),
                'total_records' => $total,
                'per_page' => $limit
            ]
        ];
    }

    public function createExample(array $data): array
    {
        // Validate data
        $this->validateExampleData($data);

        // Prepare data
        $exampleData = [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_at' => date('Y-m-d H:i:s')
        ];

        // Create in database
        $id = $this->repository->create($exampleData);

        // Log activity
        $this->logger->info('Example created', [
            'example_id' => $id,
            'name' => $exampleData['name']
        ]);

        // Return created resource
        return $this->repository->findById($id);
    }

    private function validateExampleData(array $data): void
    {
        if (empty($data['name'])) {
            throw new \InvalidArgumentException('Name is required');
        }

        if (strlen($data['name']) > 255) {
            throw new \InvalidArgumentException('Name must not exceed 255 characters');
        }

        if (isset($data['status']) && !in_array($data['status'], ['active', 'inactive'])) {
            throw new \InvalidArgumentException('Invalid status value');
        }
    }
}
```

### Creating a Repository

```php
<?php
// src/Repository/ExampleRepository.php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;

class ExampleRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(
        DatabaseService $database,
        LoggerInterface $logger
    ) {
        $this->database = $database;
        $this->logger = $logger;
    }

    public function findAll(int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT 
                id,
                name,
                description,
                status,
                created_at,
                updated_at
            FROM examples
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->database->getConnection()->prepare($sql);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $sql = "
            SELECT *
            FROM examples
            WHERE id = :id AND deleted_at IS NULL
        ";

        $stmt = $this->database->getConnection()->prepare($sql);
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function create(array $data): int
    {
        $sql = "
            INSERT INTO examples (name, description, status, created_at)
            VALUES (:name, :description, :status, :created_at)
        ";

        $stmt = $this->database->getConnection()->prepare($sql);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':status', $data['status']);
        $stmt->bindValue(':created_at', $data['created_at']);
        $stmt->execute();

        return (int)$this->database->getConnection()->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = "
            UPDATE examples
            SET name = :name,
                description = :description,
                status = :status,
                updated_at = :updated_at
            WHERE id = :id
        ";

        $stmt = $this->database->getConnection()->prepare($sql);
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->bindValue(':name', $data['name']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':status', $data['status']);
        $stmt->bindValue(':updated_at', date('Y-m-d H:i:s'));
        
        return $stmt->execute();
    }

    public function delete(int $id): bool
    {
        // Soft delete
        $sql = "
            UPDATE examples
            SET deleted_at = :deleted_at
            WHERE id = :id
        ";

        $stmt = $this->database->getConnection()->prepare($sql);
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->bindValue(':deleted_at', date('Y-m-d H:i:s'));
        
        return $stmt->execute();
    }

    public function count(): int
    {
        $sql = "SELECT COUNT(*) FROM examples WHERE deleted_at IS NULL";
        $stmt = $this->database->getConnection()->query($sql);
        return (int)$stmt->fetchColumn();
    }
}
```

### Registering Routes

```php
// src/Application.php (in setupRoutes method)

$exampleController = new ExampleController(
    $exampleService,
    $this->logger
);

$this->app->group('/api/v1/examples', function ($group) use ($exampleController) {
    $group->get('', [$exampleController, 'getExamples']);
    $group->post('', [$exampleController, 'createExample']);
    $group->get('/{id:[0-9]+}', [$exampleController, 'getExample']);
    $group->put('/{id:[0-9]+}', [$exampleController, 'updateExample']);
    $group->delete('/{id:[0-9]+}', [$exampleController, 'deleteExample']);
})->add(new AuthMiddleware($this->jwtService, $this->userRepository, $this->logger));
```

---

## Database Guidelines

### Naming Conventions

**Tables:**
- Use plural nouns: `bookings`, `customers`, `events`
- Snake_case: `cancellation_requests`, `booking_orders`
- Avoid abbreviations

**Columns:**
- Snake_case: `first_name`, `created_at`
- Boolean columns: Prefix with `is_` or `has_`: `is_active`, `has_refund`
- Foreign keys: `{table}_id`: `customer_id`, `booking_id`
- Timestamps: `created_at`, `updated_at`, `deleted_at`

**Indexes:**
- Primary key: `PRIMARY KEY` (usually `id`)
- Foreign keys: `fk_{table}_{column}`: `fk_bookings_customer_id`
- Indexes: `idx_{table}_{column(s)}`: `idx_bookings_status`

### Schema Best Practices

**1. Always use InnoDB engine**
```sql
CREATE TABLE examples (
    ...
) ENGINE=InnoDB;
```

**2. Use appropriate data types**
```sql
id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
email           VARCHAR(255)
price           DECIMAL(10,2)
is_active       BOOLEAN DEFAULT TRUE
status          ENUM('pending', 'active', 'cancelled')
description     TEXT
meta_data       JSON
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**3. Add indexes for frequently queried columns**
```sql
INDEX idx_bookings_customer_id (customer_id)
INDEX idx_bookings_status (status)
INDEX idx_bookings_created_at (created_at)
```

**4. Use foreign key constraints**
```sql
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
```

**5. Include audit columns**
```sql
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at      TIMESTAMP NULL  -- For soft deletes
```

### Migration Example

```sql
-- migrations/003_add_examples_table.sql

-- Up migration
CREATE TABLE IF NOT EXISTS examples (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    user_id BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_examples_status (status),
    INDEX idx_examples_user_id (user_id),
    INDEX idx_examples_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Down migration (for rollback)
-- DROP TABLE IF EXISTS examples;
```

Run migration:
```bash
php bin/migrate.php up
```

---

## API Integration

### XS2Event API Integration

The system acts as a proxy to XS2Event API for sports data.

**Service Pattern:**

```php
<?php
// src/Service/XS2EventService.php

use GuzzleHttp\Client;
use Psr\Log\LoggerInterface;

class XS2EventService
{
    private Client $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private LoggerInterface $logger;

    public function __construct(
        Client $httpClient,
        string $baseUrl,
        string $apiKey,
        LoggerInterface $logger
    ) {
        $this->httpClient = $httpClient;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->logger = $logger;
    }

    public function getEvents(array $filters = []): array
    {
        $endpoint = '/events';
        $queryParams = $this->buildQueryParams($filters);

        try {
            $response = $this->httpClient->get($this->baseUrl . $endpoint, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json'
                ],
                'query' => $queryParams,
                'timeout' => 15
            ]);

            $data = json_decode((string)$response->getBody(), true);
            return $data;

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            $this->logger->error('XS2Event API request failed', [
                'endpoint' => $endpoint,
                'error' => $e->getMessage()
            ]);
            
            throw new \RuntimeException('Failed to fetch events from XS2Event API');
        }
    }

    private function buildQueryParams(array $filters): array
    {
        $params = [];
        
        if (!empty($filters['tournament_id'])) {
            $params['tournament_id'] = $filters['tournament_id'];
        }
        
        if (!empty($filters['start_date'])) {
            $params['start_date'] = $filters['start_date'];
        }
        
        return $params;
    }
}
```

### Stripe Integration

```php
<?php
// src/Service/StripePaymentService.php

use Stripe\StripeClient;
use Psr\Log\LoggerInterface;

class StripePaymentService
{
    private StripeClient $stripe;
    private LoggerInterface $logger;

    public function __construct(string $secretKey, LoggerInterface $logger)
    {
        $this->stripe = new StripeClient($secretKey);
        $this->logger = $logger;
    }

    public function createPaymentIntent(
        int $amount,
        string $currency,
        array $metadata = []
    ): array {
        try {
            $paymentIntent = $this->stripe->paymentIntents->create([
                'amount' => $amount,
                'currency' => $currency,
                'metadata' => $metadata,
                'automatic_payment_methods' => [
                    'enabled' => true
                ]
            ]);

            return [
                'payment_intent_id' => $paymentIntent->id,
                'client_secret' => $paymentIntent->client_secret
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            $this->logger->error('Stripe payment intent creation failed', [
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            throw new \RuntimeException('Failed to create payment intent');
        }
    }

    public function refund(string $paymentIntentId, ?int $amount = null): array
    {
        try {
            $refundData = ['payment_intent' => $paymentIntentId];
            
            if ($amount !== null) {
                $refundData['amount'] = $amount;
            }

            $refund = $this->stripe->refunds->create($refundData);

            return [
                'refund_id' => $refund->id,
                'status' => $refund->status,
                'amount' => $refund->amount
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            $this->logger->error('Stripe refund failed', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage()
            ]);
            
            throw new \RuntimeException('Failed to process refund');
        }
    }
}
```

---

## Authentication & Authorization

### JWT Token Generation

```php
<?php
// src/Service/JWTService.php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTService
{
    private string $secretKey;
    private int $accessExpiry;
    private int $refreshExpiry;

    public function __construct(
        string $secretKey,
        int $accessExpiry = 3600,
        int $refreshExpiry = 86400
    ) {
        $this->secretKey = $secretKey;
        $this->accessExpiry = $accessExpiry;
        $this->refreshExpiry = $refreshExpiry;
    }

    public function generateAccessToken(int $userId, string $role): string
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + $this->accessExpiry;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'sub' => $userId,
            'role' => $role,
            'type' => 'access'
        ];

        return JWT::encode($payload, $this->secretKey, 'HS256');
    }

    public function generateRefreshToken(int $userId): string
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + $this->refreshExpiry;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'sub' => $userId,
            'type' => 'refresh'
        ];

        return JWT::encode($payload, $this->secretKey, 'HS256');
    }

    public function validateToken(string $token): ?\stdClass
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, 'HS256'));
            return $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }
}
```

### Authentication Middleware

```php
<?php
// src/Middleware/AuthMiddleware.php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response;

class AuthMiddleware
{
    private JWTService $jwtService;
    private AdminUserRepository $userRepository;
    private LoggerInterface $logger;

    public function __construct(
        JWTService $jwtService,
        AdminUserRepository $userRepository,
        LoggerInterface $logger
    ) {
        $this->jwtService = $jwtService;
        $this->userRepository = $userRepository;
        $this->logger = $logger;
    }

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $this->unauthorizedResponse();
        }

        $token = $matches[1];
        $decoded = $this->jwtService->validateToken($token);

        if (!$decoded) {
            return $this->unauthorizedResponse('Invalid or expired token');
        }

        // Load user
        $user = $this->userRepository->findById((int)$decoded->sub);
        
        if (!$user || $user['status'] !== 'active') {
            return $this->unauthorizedResponse('User not found or inactive');
        }

        // Attach user to request
        $request = $request->withAttribute('user', $user);

        return $handler->handle($request);
    }

    private function unauthorizedResponse(string $message = 'Authentication required'): Response
    {
        $response = new Response();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => [
                'code' => 'AUTHENTICATION_REQUIRED',
                'message' => $message
            ]
        ]));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
```

---

## Testing

### Unit Testing with PHPUnit

```php
<?php
// tests/Unit/Service/ExampleServiceTest.php

use PHPUnit\Framework\TestCase;
use XS2EventProxy\Service\ExampleService;
use XS2EventProxy\Repository\ExampleRepository;
use Psr\Log\LoggerInterface;

class ExampleServiceTest extends TestCase
{
    private ExampleService $service;
    private ExampleRepository $repository;
    private LoggerInterface $logger;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(ExampleRepository::class);
        $this->logger = $this->createMock(LoggerInterface::class);
        $this->service = new ExampleService($this->repository, $this->logger);
    }

    public function testCreateExample(): void
    {
        $data = [
            'name' => 'Test Example',
            'description' => 'Test description'
        ];

        $this->repository
            ->expects($this->once())
            ->method('create')
            ->willReturn(1);

        $this->repository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn(['id' => 1, 'name' => 'Test Example']);

        $result = $this->service->createExample($data);

        $this->assertEquals(1, $result['id']);
        $this->assertEquals('Test Example', $result['name']);
    }

    public function testCreateExampleValidationFails(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Name is required');

        $this->service->createExample([]);
    }
}
```

Run tests:
```bash
./vendor/bin/phpunit
```

---

## Coding Standards

### PHP Standards (PSR-12)

**1. File Structure:**
```php
<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ExampleController
{
    // Class implementation
}
```

**2. Indentation:** 4 spaces (no tabs)

**3. Line Length:** Max 120 characters

**4. Naming:**
- Classes: PascalCase (`ExampleController`)
- Methods: camelCase (`getExample`)
- Variables: camelCase (`$exampleData`)
- Constants: UPPER_SNAKE_CASE (`MAX_LIMIT`)

**5. Type Declarations:**
```php
public function example(int $id, string $name): bool
{
    return true;
}
```

### TypeScript Standards

**1. Interfaces for Props:**
```typescript
interface ComponentProps {
  title: string;
  count?: number;  // Optional
  onAction: (id: number) => void;
}
```

**2. Explicit Return Types:**
```typescript
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**3. Avoid `any`:**
```typescript
// Bad
function process(data: any): any {
  return data;
}

// Good
function process<T>(data: T): T {
  return data;
}
```

### Code Formatting

Use Prettier for frontend:
```bash
npm install --save-dev prettier
npm run format
```

Use PHP_CodeSniffer for backend:
```bash
composer require --dev squizlabs/php_codesniffer
./vendor/bin/phpcs src/
```

---

## Git Workflow

*Note: Git is not included in the delivery package. This section is for reference if you choose to implement version control.*

### Branch Strategy

```
main
  ├── develop
  │   ├── feature/booking-system
  │   ├── feature/admin-dashboard
  │   └── bugfix/payment-error
  └── hotfix/critical-security-fix
```

### Commit Messages

```
feat: Add customer cancellation request feature
fix: Resolve Stripe refund processing bug
docs: Update API documentation for booking endpoint
refactor: Improve booking service code structure
test: Add unit tests for refund service
chore: Update dependencies
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console errors
- [ ] Reviewed by peer
```

---

## Troubleshooting

### Common Issues

**Issue: CORS errors in browser console**

**Solution:**
1. Check `CORS_ALLOWED_ORIGINS` in API `.env`
2. Ensure frontend URL is included
3. Restart API server after changes

**Issue: JWT token invalid**

**Solution:**
1. Check `JWT_SECRET` matches between frontend and backend
2. Verify token hasn't expired
3. Clear browser local storage and login again

**Issue: Database connection failed**

**Solution:**
1. Verify database credentials in `.env`
2. Check MySQL service is running: `systemctl status mysql`
3. Test connection: `mysql -u user -p database_name`

**Issue: Stripe payments not working**

**Solution:**
1. Verify using test keys in development
2. Check Stripe dashboard for errors
3. Ensure webhook endpoint is accessible
4. Review API logs for Stripe errors

---

## Performance Optimization

### Frontend Optimization

**1. Code Splitting:**
```typescript
// Lazy load pages
const EventsPage = React.lazy(() => import('./pages/EventsPage'));

<Suspense fallback={<Loading />}>
  <EventsPage />
</Suspense>
```

**2. Image Optimization:**
- Use WebP format
- Implement lazy loading
- Use appropriate sizes

**3. Caching:**
```typescript
// Cache API responses
const cachedData = localStorage.getItem('events');
if (cachedData) {
  return JSON.parse(cachedData);
}
```

### Backend Optimization

**1. Database Indexing:**
```sql
CREATE INDEX idx_bookings_customer_status 
ON bookings(customer_id, booking_status);
```

**2. Query Optimization:**
```php
// Bad: N+1 query problem
foreach ($bookings as $booking) {
    $customer = $customerRepo->findById($booking['customer_id']);
}

// Good: Join query
$bookings = $bookingRepo->findWithCustomers();
```

**3. Caching:**
```php
// Cache expensive queries
$cacheKey = "events_list_{$tournamentId}";
$events = $cache->get($cacheKey);

if (!$events) {
    $events = $xs2eventService->getEvents(['tournament_id' => $tournamentId]);
    $cache->set($cacheKey, $events, 300); // 5 minutes
}
```

**4. Lazy Loading:**
```php
// Only load data when needed
public function getBooking(int $id): array
{
    $booking = $this->findById($id);
    // Don't load orders unless specifically requested
    return $booking;
}
```

---

## Appendix

### Useful Commands

**Frontend:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

**Backend:**
```bash
composer install     # Install dependencies
php -S localhost:8000 -t public  # Built-in server
./vendor/bin/phpunit # Run tests
php bin/migrate.php  # Run migrations
```

**Database:**
```bash
mysql -u root -p < rondo.sql  # Import schema
mysqldump -u root -p rondo_dev > backup.sql  # Backup
```

### Environment Variables Reference

**Frontend:**
```env
VITE_XS2EVENT_BASE_URL=http://rondoapi.local
VITE_XS2EVENT_API_KEY=your_api_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_***
VITE_WHATSAPP_NUMBER=1234567890
```

**Backend:**
```env
APP_URL=http://rondoapi.local/
DB_HOST=localhost
DB_NAME=rondo_dev
DB_USER=rondo_user
DB_PASS=password
JWT_SECRET=your_secret_key
STRIPE_SECRET_KEY=sk_test_***
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

**Developer Guide Version:** 1.0.0  
**Last Updated:** November 19, 2025  
**Maintained by:** Rondo Development Team
