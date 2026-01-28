# Hospitality Management Module

## Overview
The Hospitality Management Module allows administrators to manage hospitality services and assign them to event tickets. This module is integrated into the Event Tickets page at `/events/{event_id}/tickets`.

## Features

### 1. Hospitality Services Management
- **CRUD Operations**: Create, Read, Update, Delete hospitality services
- **Service Details**: Name, description, price (USD), active status, sort order
- **Statistics**: Track total services, active/inactive counts, and total assignments

### 2. Ticket-Hospitality Assignments
- **Event-Level Management**: Assign hospitality services to specific tickets within an event
- **Batch Assignment**: Assign multiple hospitality services to multiple tickets at once
- **Custom Pricing**: Optional custom price override for specific ticket-hospitality combinations
- **Real-time Updates**: Changes are reflected immediately

### 3. User Interface
- **Modal Interface**: Clean, modern modal for managing hospitality assignments
- **Service Cards**: Visual display of available hospitality services with pricing
- **Ticket Selection**: Expandable ticket cards with checkbox selection for hospitalities
- **Summary Display**: Shows count and total price of assigned services per ticket
- **Responsive Design**: Mobile-friendly layout

## Architecture

### Backend (API)

#### Database Tables

**hospitalities**
```sql
- id: Primary key
- name: Service name
- description: Service description
- price_usd: Price in USD
- is_active: Boolean flag
- sort_order: Display order
- created_by: Admin user ID
- updated_by: Admin user ID
- created_at: Timestamp
- updated_at: Timestamp
```

**ticket_hospitalities**
```sql
- id: Primary key
- event_id: XS2Event event ID
- ticket_id: XS2Event ticket ID
- hospitality_id: Reference to hospitalities table
- custom_price_usd: Optional custom price override
- created_by: Admin user ID
- created_at: Timestamp
```

#### API Endpoints

**Hospitality Services CRUD**
- `GET /api/v1/admin/hospitalities` - Get all hospitality services
- `GET /api/v1/admin/hospitalities/{id}` - Get single service
- `POST /api/v1/admin/hospitalities` - Create new service
- `PUT /api/v1/admin/hospitalities/{id}` - Update service
- `DELETE /api/v1/admin/hospitalities/{id}` - Delete service
- `GET /api/v1/admin/hospitalities/stats` - Get statistics

**Ticket-Hospitality Assignments**
- `GET /api/v1/admin/hospitalities/event/{eventId}` - Get all assignments for an event
- `GET /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}` - Get ticket's hospitalities
- `POST /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}` - Assign hospitalities to ticket
- `POST /api/v1/admin/hospitalities/batch` - Batch assign hospitalities
- `DELETE /api/v1/admin/hospitalities/ticket/{eventId}/{ticketId}` - Remove ticket hospitalities
- `DELETE /api/v1/admin/hospitalities/event/{eventId}` - Remove all event hospitalities

#### Files
- `api/src/Controller/HospitalityController.php` - Controller handling requests
- `api/src/Repository/HospitalityRepository.php` - Database operations
- `api/migrations/create_hospitalities_table.sql` - Database schema

### Frontend

#### Components
- `frontend/src/components/HospitalityManager.tsx` - Main modal component
- `frontend/src/components/HospitalityManager.module.css` - Component styles

#### Services
- `frontend/src/services/hospitalityService.ts` - API client for hospitality endpoints

#### Hooks
- `frontend/src/hooks/useHospitalities.ts` - Fetch all hospitality services
- `frontend/src/hooks/useEventHospitalities.ts` - Fetch event hospitality assignments

#### Types
```typescript
interface Hospitality {
  id: number;
  name: string;
  description: string | null;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

interface TicketHospitality {
  id: number;
  event_id: string;
  ticket_id: string;
  hospitality_id: number;
  custom_price_usd: number | null;
  created_by: number | null;
  created_at: string;
  hospitality_name?: string;
  hospitality_description?: string | null;
  hospitality_price_usd?: number;
  hospitality_is_active?: boolean;
}
```

## Usage

### Admin Access Only
The Hospitality Management button only appears on the Event Tickets page for authenticated admin users. Authentication is checked via `localStorage.getItem('adminToken')`.

### Managing Hospitality Services

1. **Navigate** to `/events/{event_id}/tickets`
2. **Click** the "Manage Hospitality" button (purple button with chef hat icon)
3. **View** available hospitality services in the modal
4. **Expand** a ticket card by clicking the "+" button
5. **Select/Deselect** hospitality services using checkboxes
6. **Review** the summary showing count and total price
7. **Click** "Save Assignments" to persist changes

### Workflow Example

```
1. Admin creates hospitality services:
   - VIP Lounge Access: $100
   - Full Day Meal: $25

2. Admin navigates to event tickets page

3. Admin opens Hospitality Manager modal

4. Admin assigns services to tickets:
   - Premium Ticket: VIP Lounge Access + Full Day Meal
   - Standard Ticket: Full Day Meal only

5. Changes are saved and visible immediately
```

## Data Flow

```
User Action → Frontend Component → API Service → API Endpoint → Repository → Database
                                                                              ↓
User Interface ← Component State ← API Response ← Controller Response ← Query Result
```

## Error Handling

### Frontend
- **Loading States**: Shows spinner while fetching data
- **Empty States**: Displays message when no services exist
- **Error Messages**: Shows user-friendly error messages
- **Validation**: Prevents invalid operations

### Backend
- **Authentication**: Requires admin JWT token
- **Validation**: Validates required fields and data types
- **Error Responses**: Returns structured error messages
- **Transaction Safety**: Uses database transactions for batch operations

## Security

- **Authentication Required**: All endpoints require admin authentication
- **Authorization**: Only admin users can access hospitality management
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Protection**: Uses parameterized queries
- **CSRF Protection**: Token-based authentication

## Performance Considerations

- **Batch Operations**: Use batch endpoint for multiple assignments
- **Caching**: Frontend caches hospitality services
- **Optimistic Updates**: UI updates before API confirmation
- **Database Indexes**: Indexes on event_id, ticket_id, hospitality_id

## Future Enhancements

1. **Custom Pricing per Ticket**: Support for custom_price_usd field
2. **Service Categories**: Group hospitality services by category
3. **Availability Management**: Time-based or stock-limited services
4. **Image Support**: Add images to hospitality services
5. **Multi-Language**: Support for service names/descriptions in multiple languages
6. **Analytics**: Track most popular hospitality services
7. **Customer View**: Display assigned hospitalities in customer checkout flow

## Testing

### Manual Testing Checklist

- [ ] Admin can view all hospitality services
- [ ] Admin can assign hospitalities to tickets
- [ ] Admin can remove hospitalities from tickets
- [ ] Assignments persist after page reload
- [ ] Non-admin users don't see the button
- [ ] Error messages display correctly
- [ ] Loading states work properly
- [ ] Responsive design works on mobile

### API Testing
Use the Postman collection or test directly:

```bash
# Get all hospitalities
curl -X GET http://localhost:8080/api/v1/admin/hospitalities \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Assign hospitalities to ticket
curl -X POST http://localhost:8080/api/v1/admin/hospitalities/ticket/EVENT_ID/TICKET_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hospitality_ids": [1, 2]}'
```

## Troubleshooting

### Issue: Button not appearing
- **Solution**: Ensure you're logged in as admin and adminToken exists in localStorage

### Issue: Services not loading
- **Solution**: Check API endpoint is accessible and returns valid JSON

### Issue: Save fails
- **Solution**: Verify admin token is valid and not expired

### Issue: Changes not persisting
- **Solution**: Check database connection and verify API endpoint returns success

## Support

For issues or questions about the Hospitality Management Module:
1. Check the error console in browser DevTools
2. Review API logs in `api/logs/`
3. Verify database schema is up to date
4. Ensure all migrations have been run

## Version History

- **v1.0.0** (January 2026): Initial implementation
  - Basic CRUD for hospitality services
  - Ticket assignment functionality
  - Admin-only access
  - Modal UI interface
