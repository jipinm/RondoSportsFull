# Xs2Event Admin Portal

A responsive admin portal prototype for the Xs2Event ticket booking system, built with React, TypeScript, and Vite.

![Xs2Event Admin Portal](./src/assets/images/screenshot.png)

## 📋 Overview

This prototype demonstrates a complete admin interface for an event ticket booking system. It includes a comprehensive set of features designed to help event administrators manage bookings, users, content, and analytics in a single, intuitive interface.

### Features

- **Authentication & Authorization**
  - Secure login with role-based access control
  - Protected routes for authenticated users only

- **Dashboard**
  - Summary cards with key metrics
  - Interactive charts for bookings and revenue trends
  - Recent activity feed
  - Top performing events visualization

- **Booking Management**
  - Comprehensive booking list with advanced filters
  - Detailed view of individual bookings
  - Status management (confirm, cancel, refund)

- **User Management**
  - User listing with search and filtering
  - User profile editing
  - Status toggling (activate/deactivate)
  - Role management

- **Refund & Cancellation**
  - Request list with status filters
  - Approval/rejection workflow
  - Reason documentation

- **Content Management**
  - Static page editing (Terms, Privacy Policy, About)
  - Banner management with preview
  - Content activation/deactivation

- **Reports & Analytics**
  - Revenue reports with visualizations
  - Booking statistics and trends
  - User activity analytics
  - Filter by date ranges and custom parameters
  - Export functionality

- **Settings**
  - User profile management
  - Security settings (password, 2FA)
  - Notification preferences
  - Role permissions management

- **Responsive Design**
  - Optimized for desktop, tablet, and mobile devices
  - Collapsible sidebar for space management

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm installed

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/xs2event-admin.git
cd xs2event-admin
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173` to view the admin portal

### Login Credentials

For demo purposes, you can use these mock credentials:

- **Admin User**:
  - Email: `jane.smith@example.com`
  - Password: any non-empty string will work

- **Super Admin**:
  - Email: `john.doe@example.com`
  - Password: any non-empty string will work

## 🧰 Tech Stack

- **React** - UI library
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **React Router** - Navigation and routing
- **CSS Modules** - Scoped styling
- **Recharts** - Interactive charts and visualizations
- **Lucide React** - Beautiful and consistent icons

## 📁 Project Structure

```
src/
  ├── assets/          # Static assets (images, icons)
  ├── components/      # Reusable UI components
  ├── contexts/        # React context providers
  ├── hooks/           # Custom React hooks
  ├── layouts/         # Layout components
  ├── mock-data/       # Mock data for prototype
  ├── pages/           # Main page components
  ├── services/        # API services and utilities
  ├── styles/          # Global styles
  └── utils/           # Utility functions
```

## 🔒 Authentication Flow

This prototype uses a simulated authentication flow with mock data:

1. User submits login credentials
2. AuthContext checks against mock user data
3. On success, user data is stored in local storage
4. Protected routes check authentication status via the AuthContext
5. Logout clears user data from storage

## 📱 Responsive Design

The admin portal is fully responsive with three main breakpoints:

- **Desktop** (1200px and above) - Full layout with expanded sidebar
- **Tablet** (768px to 1199px) - Condensed layout with collapsible sidebar
- **Mobile** (below 768px) - Mobile-optimized view with hidden sidebar

## ⚙️ Configuration

The application uses environment variables for configuration:

```
VITE_API_URL=your_api_url_here
VITE_APP_VERSION=1.0.0
```

## 🧪 Future Improvements

For a production version, consider implementing:

- Real API integration with backend services
- Unit and integration testing
- Advanced state management (Redux, Zustand)
- Dark mode toggle
- Multi-language support
- Real-time updates with WebSockets
- Advanced access control

## 📄 License

[MIT](LICENSE)

## 👥 Contributors

- John Doe - Initial development

---

*This is a prototype application using mock data. In a production environment, it would connect to a real backend API for data management.*
