# Ticket Enhancements API - Markup Pricing & Hospitality

This document describes the public API endpoints for ticket markup pricing and hospitality services, available for the customer-facing frontend application.

## Overview

The ticket enhancements feature consists of two main components:
1. **Markup Pricing** - Dynamic price adjustments for tickets
2. **Hospitality Services** - Add-on services available for tickets

## API Endpoints

### Markup Pricing

#### Get Event Markups
```
GET /v1/events/{eventId}/markups
```

Returns markup pricing for all tickets in an event.

**Response:**
```json
{
  "success": true,
  "data": {
    "event_id": "event123",
    "markups": [
      {
        "id": 1,
        "ticket_id": "ticket123",
        "event_id": "event123",
        "markup_price_usd": 10.00,
        "base_price_usd": 50.00,
        "final_price_usd": 60.00,
        "created_at": "2026-01-22T10:00:00Z",
        "updated_at": "2026-01-22T10:00:00Z"
      }
    ]
  }
}
```

#### Get Ticket Markup
```
GET /v1/tickets/{ticketId}/markup
```

Returns markup pricing for a specific ticket.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticket_id": "ticket123",
    "event_id": "event123",
    "markup_price_usd": 10.00,
    "base_price_usd": 50.00,
    "final_price_usd": 60.00,
    "created_at": "2026-01-22T10:00:00Z",
    "updated_at": "2026-01-22T10:00:00Z"
  }
}
```

Returns `null` in data if no markup exists for the ticket.

### Hospitality Services

#### Get All Active Hospitalities
```
GET /v1/hospitalities
```

Returns all active hospitality services available for selection.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "VIP Lounge Access",
      "description": "Access to exclusive VIP lounge with complimentary refreshments",
      "price_usd": 50.00,
      "is_active": true,
      "sort_order": 1,
      "created_at": "2026-01-22T10:00:00Z",
      "updated_at": "2026-01-22T10:00:00Z"
    }
  ]
}
```

#### Get Event Hospitalities
```
GET /v1/events/{eventId}/hospitalities
```

Returns all hospitality services assigned to tickets in an event.

**Response:**
```json
{
  "success": true,
  "data": {
    "event_id": "event123",
    "hospitalities": [
      {
        "id": 1,
        "hospitality_id": 1,
        "event_id": "event123",
        "ticket_id": "ticket123",
        "created_at": "2026-01-22T10:00:00Z",
        "hospitality_name": "VIP Lounge Access",
        "hospitality_price_usd": 50.00
      }
    ],
    "grouped_by_ticket": {
      "ticket123": [
        {
          "id": 1,
          "hospitality_id": 1,
          "event_id": "event123",
          "ticket_id": "ticket123",
          "hospitality_name": "VIP Lounge Access",
          "hospitality_price_usd": 50.00
        }
      ]
    }
  }
}
```

#### Get Ticket Hospitalities
```
GET /v1/tickets/{ticketId}/hospitalities?event_id={eventId}
```

Returns hospitality services for a specific ticket.

**Query Parameters:**
- `event_id` (required) - The event ID

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket_id": "ticket123",
    "event_id": "event123",
    "hospitalities": [
      {
        "id": 1,
        "hospitality_id": 1,
        "event_id": "event123",
        "ticket_id": "ticket123",
        "hospitality_name": "VIP Lounge Access",
        "hospitality_price_usd": 50.00
      }
    ]
  }
}
```

## Frontend Integration

### Using the Service

```typescript
import ticketEnhancementsService from '@/services/ticketEnhancementsService';

// Get event markups
const markups = await ticketEnhancementsService.getEventMarkups('event123');

// Get ticket markup
const markup = await ticketEnhancementsService.getTicketMarkup('ticket123');

// Apply markup to price
const finalPrice = ticketEnhancementsService.applyMarkupToPrice(50.00, markup);

// Get active hospitalities
const hospitalities = await ticketEnhancementsService.getActiveHospitalities();

// Get event hospitalities
const eventHospitalities = await ticketEnhancementsService.getEventHospitalities('event123');

// Calculate hospitality total
const total = ticketEnhancementsService.calculateHospitalityTotal([1, 2], hospitalities);
```

### Using React Hooks

```typescript
import {
  useEventMarkups,
  useTicketMarkup,
  useActiveHospitalities,
  useEventHospitalities,
  useTicketHospitalities,
} from '@/hooks/useTicketEnhancements';

function EventTicketsPage() {
  const eventId = 'event123';
  
  // Get all markups for the event
  const { markups, markupsByTicket, loading: markupsLoading } = useEventMarkups(eventId);
  
  // Get hospitalities for the event
  const { 
    eventHospitalities, 
    hospitalitiesByTicket, 
    loading: hospitalitiesLoading 
  } = useEventHospitalities(eventId);
  
  // Get all active hospitality services
  const { hospitalities } = useActiveHospitalities();
  
  // Access markup for a specific ticket
  const ticketMarkup = markupsByTicket.get('ticket123');
  
  // Access hospitalities for a specific ticket
  const ticketHospitalities = hospitalitiesByTicket.get('ticket123');
  
  // ... rest of component
}
```

### Example: Displaying Price with Markup

```typescript
function TicketCard({ ticket }: { ticket: Ticket }) {
  const { markupsByTicket } = useEventMarkups(ticket.event_id);
  
  const markup = markupsByTicket.get(ticket.ticket_id);
  const basePrice = ticket.face_value;
  const finalPrice = markup?.final_price_usd || basePrice;
  
  return (
    <div className="ticket-card">
      <h3>{ticket.ticket_title}</h3>
      {markup && (
        <div className="price">
          <span className="original-price">${basePrice.toFixed(2)}</span>
          <span className="final-price">${finalPrice.toFixed(2)}</span>
          <span className="markup">+${markup.markup_price_usd.toFixed(2)}</span>
        </div>
      )}
      {!markup && (
        <div className="price">
          <span className="final-price">${basePrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
```

### Example: Displaying Hospitality Options

```typescript
function TicketHospitalitySelector({ ticket }: { ticket: Ticket }) {
  const { hospitalitiesByTicket } = useEventHospitalities(ticket.event_id);
  const [selectedHospitalities, setSelectedHospitalities] = useState<number[]>([]);
  
  const availableHospitalities = hospitalitiesByTicket.get(ticket.ticket_id) || [];
  
  if (availableHospitalities.length === 0) {
    return null;
  }
  
  return (
    <div className="hospitality-options">
      <h4>Add Hospitality Services</h4>
      {availableHospitalities.map(h => (
        <label key={h.hospitality_id}>
          <input
            type="checkbox"
            checked={selectedHospitalities.includes(h.hospitality_id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedHospitalities([...selectedHospitalities, h.hospitality_id]);
              } else {
                setSelectedHospitalities(
                  selectedHospitalities.filter(id => id !== h.hospitality_id)
                );
              }
            }}
          />
          <span>{h.hospitality_name}</span>
          <span>${h.hospitality_price_usd.toFixed(2)}</span>
        </label>
      ))}
    </div>
  );
}
```

## Caching

All public endpoints include appropriate cache headers:
- Markup pricing: 5 minutes
- Hospitality services: 5-10 minutes

This improves performance while ensuring pricing remains current.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Frontend service functions handle 404 errors gracefully by returning empty arrays or null values rather than throwing errors, as missing markup/hospitality data is not necessarily an error condition.

## Admin Endpoints

Admin-only endpoints for managing markup pricing and hospitality services are available at:
- `/api/v1/admin/ticket-markups/*` - Markup management
- `/api/v1/admin/hospitalities/*` - Hospitality management

See the admin application for documentation on these endpoints.
