# Rondo Sports - Sports Ticket Booking Platform

A modern React-based sports ticket booking platform integrated with XS2Event API for real-time sports data and ticket management.

## Overview

This application implements a complete sports ticket booking system following the hierarchical structure: **Sports → Tournaments → Events → Categories → Tickets → Booking**. Built with React, TypeScript, and Vite, it provides a seamless user experience for discovering and booking sports event tickets.

## Tech Stack & Dependencies

- **Frontend Framework**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite 6.3.5 with HMR and optimized bundling
- **Routing**: React Router DOM 7.7.1 with query parameter support
- **Styling**: CSS Modules with global variables and responsive design
- **Icons**: React Icons 5.5.0 + Lucide React 0.536.0
- **HTTP Client**: Native Fetch API with custom XS2Event wrapper
- **Development**: ESLint 9.25.0 + TypeScript ESLint for code quality
- **API Integration**: XS2Event REST+JSON API with comprehensive TypeScript interfaces

## Project Structure

```
src/
├── components/          # React components
│   ├── home/           # Homepage components (Hero, SearchBar, UpcomingEvents, WhyRondoSports)
│   ├── layout/         # Layout components (Header, Footer)
│   ├── CartPanel.tsx   # Shopping cart component with quantity management
│   └── VenueMap.tsx    # Interactive SVG-based venue map component
├── hooks/              # Custom React hooks
│   ├── useAllTeams.ts        # Teams data fetching with pagination
│   ├── useCategories.ts      # Venue categories and seating information
│   ├── useEventDetails.ts    # Individual event details
│   ├── useEvents.ts          # Events listing with filtering
│   ├── useFootballTournaments.ts  # Football-specific tournaments
│   ├── useInfiniteEvents.ts  # Infinite scroll for events
│   ├── useInfiniteScroll.ts  # Generic infinite scroll utility
│   ├── useMenuHierarchy.ts   # Navigation hierarchy with caching
│   ├── useSports.ts          # Sports data with error handling
│   ├── useTeamDetails.ts     # Individual team information
│   ├── useTeams.ts           # Teams listing
│   ├── useTickets.ts         # Ticket data with availability
│   └── useTournaments.ts     # Tournament data fetching
├── pages/              # Page components with routing
│   ├── AllSportsPage.tsx     # All sports listing page
│   ├── EventsPage.tsx        # Events listing with filtering
│   ├── EventTicketsPage.tsx  # Ticket selection and cart
│   ├── TeamsPage.tsx         # Teams listing by tournament
│   ├── TicketsPage.tsx       # Legacy tickets page
│   └── TournamentsPage.tsx   # Tournaments by sport
├── services/           # API client and utilities
│   ├── apiRoutes.ts    # Complete XS2Event API client with TypeScript interfaces
│   ├── apiExamples.ts  # API usage examples and testing
│   └── apiTesting.ts   # API testing utilities
├── styles/             # Global styles and variables
│   ├── global.css      # Global CSS styles and resets
│   └── variables.css   # CSS custom properties and themes
└── utils/              # Utility functions
    ├── apiCache.ts     # Memory-based caching with TTL support
    └── dateUtils.ts    # Date formatting and season calculations
```

## Implementation Status

### ✅ Completed Tasks

**Task 1: API Client Setup** - Complete XS2Event API integration ✅
- Centralized API client with authentication
- Comprehensive error handling for all status codes (400, 401, 403, 404, 422, 429, 500, 503)
- TypeScript interfaces for all API entities
- Environment-based configuration
- Utility functions for price/date formatting
- HTTP client with proper JSON handling and request/response processing

**Task 2: Sports Discovery & Navigation** - Complete dynamic navigation system ✅
- Custom `useSports()` hook for data fetching with caching
- Fixed sports positioning (Football, Formula One, Rugby, Tennis, Cricket)
- Dynamic "Other Sports" dropdown with remaining sports
- Sport display name mapping for proper UI formatting
- Comprehensive debug logging for all API requests
- Real-time navigation links with sport-based routing

**Task 3: Tournament System** - Complete tournament browsing and management ✅
- `useTournaments()` hook for tournament data fetching
- `useMenuHierarchy()` hook for complete navigation hierarchy
- Tournament page with filtering and display
- Season-based tournament categorization using date utilities
- Tournament-to-events navigation with proper URL parameters
- Football-specific tournament submenu with nested team navigation

**Task 4: Team Management** - Complete team system with pagination ✅
- `useAllTeams()` and `useTeamDetails()` hooks
- Teams page with tournament-based filtering
- Team logo and details display
- Popular team highlighting in navigation menus
- Team-based event filtering and navigation
- Pagination support for large team datasets

**Task 5: Event Discovery & Management** - Complete event browsing system ✅
- `useEvents()` and `useEventDetails()` hooks with comprehensive filtering
- Advanced event filtering by location (Home/Away), date (Today/This Week/This Month), price
- Event cards with match details, venue information, and pricing
- Date formatting utilities for proper display
- Event status tracking and popular event highlighting
- Team-based and tournament-based event filtering

**Task 6: Ticket Management & Shopping Cart** - Complete ticketing system ✅
- `useTickets()` hook for ticket data fetching and filtering
- Event tickets page with comprehensive ticket display
- Shopping cart functionality with CartPanel component
- Ticket availability filtering and stock management
- Price calculation with booking costs
- Multi-ticket selection with quantity management
- Cart persistence and item management
- Venue map integration for visual category selection

**Task 7: Venue & Category System** - Complete venue management ✅
- `useCategories()` hook for category data fetching
- VenueMap component with interactive SVG-based seating charts
- Category-based ticket filtering and selection
- Venue details with GPS coordinates and facilities
- Interactive category highlighting and selection
- Category legend and pricing information

**Task 8: Caching & Performance** - Advanced caching implementation ✅
- `apiCache` utility with TTL-based memory caching
- Hierarchical cache keys for different data types
- Menu hierarchy caching for navigation performance
- Date-based cache invalidation strategies
- Performance optimization for frequently accessed data

**Task 9: Routing & Navigation** - Complete application routing ✅
- React Router implementation with proper URL structure
- Query parameter-based filtering and navigation
- Hierarchical routing: Sports → Tournaments → Events → Tickets
- Back navigation and breadcrumb support
- Dynamic route generation for sports, tournaments, teams, and events

**Task 10: UI Components & Layout** - Complete responsive design system ✅
- Header with dynamic sports navigation and nested menus
- Footer with comprehensive links and contact information
- Layout component with WhatsApp integration
- Homepage with Hero, SearchBar, UpcomingEvents, and WhyRondoSports sections
- CSS Modules for component-scoped styling
- Responsive design with mobile-first approach
- Loading skeletons and error states throughout the application

## Key Features

## Key Features

### Complete Ticket Booking Flow
- **Sports Discovery**: Browse all sports with dynamic navigation and real-time data
- **Tournament Filtering**: Explore tournaments by sport with season-based categorization
- **Team Management**: View popular teams with logo display and comprehensive filtering
- **Event Browsing**: Advanced filtering by location, date, and price with interactive event cards
- **Ticket Selection**: Complete ticketing system with availability tracking and cart management
- **Venue Interaction**: Interactive SVG-based venue maps with category selection
- **Shopping Cart**: Full cart functionality with quantity management and price calculation

### API Integration & Performance
- **Authentication**: Secure API key management via environment variables
- **Error Handling**: Robust handling of all HTTP status codes (400, 401, 403, 404, 422, 429, 500, 503)
- **Type Safety**: Complete TypeScript coverage for all API responses and requests
- **Caching Strategy**: Multi-level caching for sports, tournaments, teams, events, and navigation hierarchy
- **Debug Logging**: Comprehensive request/response logging for development and debugging
- **Performance Optimization**: TTL-based memory caching with intelligent cache invalidation

### User Experience & Interface
- **Responsive Design**: Mobile-first approach with CSS Grid/Flexbox and CSS Modules
- **Dynamic Navigation**: Multi-level navigation with nested submenus and sport-based routing
- **Loading States**: User-friendly skeletons and loading indicators during API calls
- **Error Recovery**: Graceful fallbacks when API is unavailable with retry mechanisms
- **Accessibility**: ARIA labels and keyboard navigation support throughout
- **Interactive Elements**: Hover effects, dynamic filtering, and real-time updates
- **Shopping Experience**: Intuitive cart management with visual feedback and persistence

## Environment Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Update .env with your XS2Event API credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

## Environment Variables

```bash
# XS2Event API Configuration
VITE_XS2EVENT_BASE_URL=http://test.local
VITE_XS2EVENT_API_KEY=e417f1be53494f5f9fbc5b350b1a5850

# Optional WhatsApp Integration
VITE_WHATSAPP_NUMBER=1234567890
```

## API Documentation

### Base Configuration
- **Sandbox URL**: `http://test.local`
- **Authentication**: `X-Api-Key` header
- **Data Format**: JSON requests/responses
- **Pricing**: Integer cents format (€50.00 = 5000)

### Core Endpoints & Features
```typescript
// Complete API endpoint coverage
API_ENDPOINTS = {
  // Sports & Discovery
  SPORTS: '/v1/sports',                    // ✅ Implemented
  TOURNAMENTS: '/v1/tournaments',          // ✅ Implemented
  TEAMS: '/v1/teams',                      // ✅ Implemented
  TEAM_DETAILS: '/v1/teams/{id}',         // ✅ Implemented
  
  // Events & Venues  
  EVENTS: '/v1/events',                    // ✅ Implemented
  EVENT_DETAILS: '/v1/events/{id}',       // ✅ Implemented
  VENUES: '/v1/venues',                    // ✅ Implemented
  
  // Tickets & Categories
  CATEGORIES: '/v1/categories',            // ✅ Implemented
  TICKETS: '/v1/tickets',                  // ✅ Implemented
  
  // Booking Flow (Ready for implementation)
  RESERVATIONS: '/v1/reservations',       // 🔄 API Ready
  BOOKINGS: '/v1/bookings',               // 🔄 API Ready
  GUEST_DATA: '/v1/reservations/{id}/guestdata', // 🔄 API Ready
  ETICKET_DOWNLOAD: '/v1/etickets/download/{booking}/{item}/url/{url}' // 🔄 API Ready
}
```

### Advanced Filtering & Search
```typescript
// Multi-parameter filtering with real-time updates
const events = await apiClient.get(API_ENDPOINTS.EVENTS, {
  sport_type: 'soccer',
  tournament_id: 'premier-league',
  team_id: 'chelsea',
  date_start: `ge:${ApiUtils.getCurrentDateForFilter()}`,
  location: 'home',
  popular: true
});

// Ticket filtering with availability and pricing
const tickets = await apiClient.get(API_ENDPOINTS.TICKETS, {
  event_id: 'chelsea-vs-arsenal',
  category_id: 'premium',
  ticket_status: 'available',
  min_price: 5000, // €50.00 in cents
  max_price: 15000 // €150.00 in cents
});
```

## Development Guidelines

## Development Guidelines

### Architecture & Code Organization
- **Component Architecture**: Each page has its own component with associated CSS module
- **Hook-based Data Management**: Custom hooks for all API interactions with caching and error handling  
- **TypeScript First**: Complete type coverage for all API responses and component interfaces
- **CSS Modules**: Component-scoped styling with consistent naming conventions
- **Responsive Design**: Mobile-first approach with flexible grid layouts

### Task Management & Documentation
Always check these files before implementation:
- **`tasks.md`** - Complete task specifications and requirements
- **`task_plan.md`** - Current implementation plan and progress  
- **`task_current.md`** - Active task details and strategy
- **`task_completed.md`** - Completed work and implementation details

### Implementation Standards
1. **API First**: All data comes from XS2Event API with proper error handling
2. **Type Safety**: Full TypeScript coverage required for all components and hooks
3. **Error Handling**: Graceful fallbacks for all failure scenarios with user-friendly messages
4. **Performance**: Implement appropriate caching strategies with TTL-based invalidation
5. **Accessibility**: WCAG 2.1 compliance for all components with proper ARIA labels
6. **Testing**: Component testing with loading states, error states, and success scenarios

### Critical Implementation Patterns
- **Ticket Grouping**: Group by `event_id`, `category_id`, `sub_category` - stick to ONE `ticket_id` per booking
- **Date Filtering**: Always include `date_stop=ge:{date}` for performance and relevant results
- **Price Handling**: All prices in integer cents, use `ApiUtils.formatPrice()` for display formatting
- **Supplier Management**: Avoid mixing suppliers to ensure seating together and consistent experience
- **Cache Management**: Use appropriate TTL values (5min for events, 20min for navigation, 30min for static data)
- **URL Structure**: Maintain consistent query parameter structure for filtering and navigation

## Testing

```bash
npm run lint        # ESLint code quality checks
npm run build       # Production build validation
npm run preview     # Preview production build
```

## Current Application Features

### Fully Functional Pages
- **Homepage** (`/`) - Hero section, search functionality, upcoming events, and company information
- **All Sports** (`/sports`) - Complete sports listing with event counts and navigation
- **Tournaments** (`/sports/{sport}/tournaments`) - Tournament browsing by sport with filtering
- **Events** (`/events`) - Advanced event filtering by sport, tournament, team, location, date, and price
- **Event Tickets** (`/events/{eventId}/tickets`) - Complete ticket selection with cart functionality
- **Teams** (`/teams`) - Team browsing with tournament-based filtering and pagination
- **Venue Maps** - Interactive SVG-based seating charts with category selection

### Navigation & User Flow
- **Multi-level Navigation**: Header with dynamic sports menu and nested tournament/team submenus
- **Filtering System**: Real-time filtering across events, tournaments, teams, and tickets
- **Shopping Cart**: Full cart functionality with quantity management, price calculation, and persistence
- **Responsive Design**: Mobile-optimized interface with touch-friendly interactions
- **Loading & Error States**: Comprehensive skeleton loading and error recovery throughout

### Data Management
- **Smart Caching**: Multi-level caching strategy for optimal performance
- **Real-time Updates**: Live data from XS2Event API with automatic refresh
- **Pagination Support**: Efficient handling of large datasets for teams and events
- **Search & Filters**: Advanced filtering capabilities across all data types

## Next Development Phase

### Ready for Implementation (APIs Connected)
- **Booking Flow**: Guest information collection and reservation management
- **Payment Integration**: Payment processing and order confirmation
- **E-ticket System**: PDF generation and mobile wallet integration
- **User Accounts**: Registration, login, and booking history
- **Advanced Search**: Global search across sports, tournaments, teams, and events

## Support

For API access and detailed specifications, contact your XS2Event account manager. Development resources available at the XS2Event Developer Portal.

## License

This project is proprietary software for Rondo Sports ticket booking platform.