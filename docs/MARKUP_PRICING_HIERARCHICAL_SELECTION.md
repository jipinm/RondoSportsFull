# Ticket Markup Pricing - Hierarchical Selection Implementation

## Overview
Implemented hierarchical Tournament → Team → Event → Ticket selection flow for the Ticket Markup Management page, matching the UX pattern used in Team Credentials.

## Implementation Date
January 2025

## Changes Made

### 1. Component Structure (`admin/src/pages/TicketMarkupManagement.tsx`)

#### New Type Definitions
```typescript
interface Tournament {
  tournament_id: string;
  name: string;
  official_name: string;
  season: string;
}

interface Team {
  team_id: string;
  name: string;
  official_name: string;
}
```

#### New State Variables
```typescript
// Hierarchical selection states
const [tournaments, setTournaments] = useState<Tournament[]>([]);
const [teams, setTeams] = useState<Team[]>([]);
const [events, setEvents] = useState<XS2Event[]>([]);
const [tickets, setTickets] = useState<XS2Ticket[]>([]);

const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
const [selectedEvent, setSelectedEvent] = useState<XS2Event | null>(null);
```

#### Removed State Variables
- `searchTerm` - No longer needed with dropdown-based selection

### 2. Cascading Data Fetch Functions

#### Step 1: Fetch Tournaments
```typescript
const fetchTournaments = useCallback(async () => {
  const currentSeason = getCurrentSeason(); // e.g., "25/26"
  const response = await fetch(
    `${baseUrl}/v1/tournaments?sport_type=soccer&season=${currentSeason}`
  );
  setTournaments(data.tournaments || []);
}, [error]);
```

#### Step 2: Fetch Teams (filtered by tournament)
```typescript
const fetchTeams = useCallback(async (tournamentId: string) => {
  const response = await fetch(
    `${baseUrl}/v1/teams?sport_type=soccer&tournament_id=${tournamentId}`
  );
  setTeams(data.teams || []);
}, [error]);
```

#### Step 3: Fetch Events (filtered by tournament and team)
```typescript
const fetchEvents = useCallback(async (tournamentId: string, teamId: string) => {
  const response = await fetch(
    `${baseUrl}/v1/events?tournament_id=${tournamentId}&team_id=${teamId}&page_size=100`
  );
  setEvents(data.data?.events || []);
}, [error]);
```

#### Step 4: Fetch Tickets (for selected event)
```typescript
const fetchTickets = useCallback(async (eventId: string) => {
  const response = await fetch(`${baseUrl}/v1/tickets?event_id=${eventId}`);
  setTickets(data.data.tickets || []);
}, [error]);
```

### 3. Selection Handlers

#### Tournament Selection
```typescript
const handleTournamentSelect = async (tournamentId: string) => {
  const tournament = tournaments.find(t => t.tournament_id === tournamentId);
  setSelectedTournament(tournament || null);
  
  // Reset downstream selections
  setSelectedTeam(null);
  setSelectedEvent(null);
  setTeams([]);
  setEvents([]);
  setTickets([]);
  setExistingMarkups([]);
  setMarkupUsd('');

  if (tournament) {
    await fetchTeams(tournamentId);
  }
};
```

#### Team Selection
```typescript
const handleTeamSelect = async (teamId: string) => {
  const team = teams.find(t => t.team_id === teamId);
  setSelectedTeam(team || null);
  
  // Reset downstream selections
  setSelectedEvent(null);
  setEvents([]);
  setTickets([]);
  setExistingMarkups([]);
  setMarkupUsd('');

  if (team && selectedTournament) {
    await fetchEvents(selectedTournament.tournament_id, teamId);
  }
};
```

#### Event Selection
```typescript
const handleEventSelect = async (eventId: string) => {
  const event = events.find(e => e.event_id === eventId);
  setSelectedEvent(event || null);
  
  // Reset downstream selections
  setTickets([]);
  setExistingMarkups([]);
  setMarkupUsd('');

  if (event) {
    await Promise.all([
      fetchTickets(event.event_id),
      fetchExistingMarkups(event.event_id)
    ]);
  }
};
```

### 4. UI Updates

#### Replaced Search-Based Selection with Dropdown Cascade

**Old UI (Search-based):**
```tsx
<Card className={styles.selectionCard}>
  <h2>Step 1: Select Event</h2>
  <div className={styles.searchBox}>
    <input type="text" placeholder="Search events..." />
  </div>
  <div className={styles.eventList}>
    {/* List of clickable events */}
  </div>
</Card>
```

**New UI (Hierarchical Dropdowns):**
```tsx
{/* Step 1: Tournament Selection */}
<Card className={styles.selectionCard}>
  <h2>Step 1: Select Tournament</h2>
  <select onChange={(e) => handleTournamentSelect(e.target.value)}>
    <option value="">-- Select Tournament --</option>
    {tournaments.map(tournament => (
      <option value={tournament.tournament_id}>{tournament.name}</option>
    ))}
  </select>
</Card>

{/* Step 2: Team Selection (shown only if tournament selected) */}
{selectedTournament && (
  <Card className={styles.selectionCard}>
    <h2>Step 2: Select Team</h2>
    <select onChange={(e) => handleTeamSelect(e.target.value)}>
      <option value="">-- Select Team --</option>
      {teams.map(team => (
        <option value={team.team_id}>{team.name}</option>
      ))}
    </select>
  </Card>
)}

{/* Step 3: Event Selection (shown only if team selected) */}
{selectedTeam && (
  <Card className={styles.selectionCard}>
    <h2>Step 3: Select Event</h2>
    <select onChange={(e) => handleEventSelect(e.target.value)}>
      <option value="">-- Select Event --</option>
      {events.map(event => (
        <option value={event.event_id}>
          {event.event_name} - {event.venue_name} - {new Date(event.date_start).toLocaleDateString()}
        </option>
      ))}
    </select>
  </Card>
)}
```

#### Updated Step Numbers
- **Step 1:** Select Tournament
- **Step 2:** Select Team
- **Step 3:** Select Event
- **Step 4:** Set Markup Price (USD) *(previously Step 2)*
- **Step 5:** Preview Final Prices *(previously Step 3)*

### 5. CSS Updates (`admin/src/pages/TicketMarkupManagement.module.css`)

#### Added Select Dropdown Styles
```css
.selectWrapper {
  width: 100%;
}

.select {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  color: #1e293b;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* Custom dropdown arrow */
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 3rem;
}

.select:hover {
  border-color: #cbd5e1;
}

.select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  border-color: #e2e8f0;
}
```

#### Removed Unused Styles
- `.searchBox`
- `.searchInput`
- `.eventList`
- `.eventItem`
- `.eventItemActive`
- `.eventInfo`
- `.eventName`
- `.eventMeta`

### 6. Helper Functions

#### getCurrentSeason()
```typescript
const getCurrentSeason = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  // Season starts in August (month 7)
  if (month >= 7) {
    // Aug-Dec: use current year and next year
    const currentYearShort = year.toString().slice(-2);
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${currentYearShort}/${nextYearShort}`;
  } else {
    // Jan-Jul: use previous year and current year
    const prevYearShort = (year - 1).toString().slice(-2);
    const currentYearShort = year.toString().slice(-2);
    return `${prevYearShort}/${currentYearShort}`;
  }
};
```

**Examples:**
- January 2025 → "24/25"
- August 2025 → "25/26"
- December 2025 → "25/26"

## User Experience Benefits

### Before (Search-Based)
1. Admin sees a flat list of ALL events across all tournaments and teams
2. Must search/scroll through hundreds of events
3. No context or hierarchy
4. Difficult to find specific event

### After (Hierarchical Selection)
1. **Step 1:** Select tournament from current season
2. **Step 2:** Select team from selected tournament
3. **Step 3:** Select event from selected team
4. **Step 4:** Configure markup pricing
5. **Step 5:** Preview and save

**Benefits:**
- ✅ Logical flow matching mental model
- ✅ Reduced cognitive load
- ✅ Faster event discovery
- ✅ Consistent UX with Team Credentials page
- ✅ Better scalability as data grows
- ✅ Progressive disclosure (only show relevant options)

## API Endpoints Used

### XS2Event API
- `GET /v1/tournaments?sport_type=soccer&season={season}` - Get tournaments for current season
- `GET /v1/teams?sport_type=soccer&tournament_id={id}` - Get teams for tournament
- `GET /v1/events?tournament_id={tid}&team_id={teamid}&page_size=100` - Get events for team
- `GET /v1/tickets?event_id={id}` - Get tickets for event

### Backend API (No Changes)
- `POST /api/v1/admin/ticket-markups/batch` - Save markup pricing
- `GET /api/v1/admin/ticket-markups/event/{eventId}` - Get existing markups
- `DELETE /api/v1/admin/ticket-markups/event/{eventId}` - Delete all markups for event

## Testing Checklist

- [ ] Tournament dropdown loads with current season tournaments
- [ ] Selecting tournament loads teams
- [ ] Selecting team loads events
- [ ] Selecting event loads tickets
- [ ] Markup input and save functionality works
- [ ] Currency conversion still works (EUR/GBP → USD)
- [ ] Preview table shows correct prices
- [ ] Delete markups functionality works
- [ ] Existing markups display correctly
- [ ] Loading states show appropriately
- [ ] Error handling for API failures
- [ ] Empty states (no teams, no events) handled gracefully
- [ ] Cascading reset works (changing tournament resets team/event selections)

## Files Modified

1. `admin/src/pages/TicketMarkupManagement.tsx` - Component logic
2. `admin/src/pages/TicketMarkupManagement.module.css` - Styles

## References

- Pattern Source: `admin/src/components/team-credentials/TeamCredentialsForm.tsx`
- Similar Implementation: Team Credentials hierarchical selection
- Specification: `Addition_to_Scope_of_Work_Rondo_Sports.html` - Enhancement #2

## Notes

- Season calculation matches Team Credentials logic
- All existing features preserved (USD conversion, batch save, delete)
- No backend changes required
- API filtering supported by XS2Event API
- Mobile responsive design maintained
