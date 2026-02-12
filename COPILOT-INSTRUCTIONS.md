**Implement Hierarchical Mark-up Pricing Across All Sports Levels**

---

### **Background (Current Implementation)**

The application is a sports ticket booking system with the following structures:

**Soccer (team-based sports):**
Sports Type → Tournament → Team → Event → Ticket Category

**Non-team sports (e.g., Formula 1, MotoGP):**
Sports Type → Tournament → Event → Ticket Category

Currently, mark-up pricing is supported **only at the Event → Ticket Category level** (mainly for soccer).
There is **no support for mark-up at higher hierarchy levels** (sport, tournament, team, event).

---

### **Change Requirement (New Behavior)**

Mark-up pricing must be supported at **all hierarchy levels**, depending on the sport type:

#### Applicable Levels:

* Sports Type
* Tournament
* Team (only for team-based sports like Soccer)
* Event
* Ticket Category

---

### **Pricing Rule (Priority & Override Logic)**

Mark-up must be applied using **most-specific override logic**:

**Priority order (highest wins):**
Ticket Category
→ Event
→ Team
→ Tournament
→ Sports Type

If a mark-up exists at a lower (more specific) level, it must override higher-level values.

---

### **Scenarios to Support**

#### **Scenario 1 – Sport-level mark-up**

If admin selects only a **Sports Type** (e.g., Formula One) and sets mark-up:
→ Apply this mark-up to **all events and ticket categories under that sport**.

---

#### **Scenario 2 – Tournament-level mark-up**

If admin selects:
Soccer → Premier League
→ Mark-up applies **only to that tournament’s tickets**
→ Other soccer tournaments use sport-level mark-up (if exists)

---

#### **Scenario 3 – Team-level mark-up**

If admin selects:
Soccer → Premier League → Manchester United
→ Mark-up applies only to **Manchester United tickets**

---

#### **Scenario 4 – Event-level mark-up**

If admin selects:
Soccer → Premier League → Manchester United → Specific Event
→ Mark-up applies only to that event’s tickets

---

#### **Scenario 5 – Full Hierarchy Example**

Configured mark-ups:

A) Soccer = $200
B) Soccer → La Liga = $100
C) Soccer → La Liga → FC Barcelona = $150
D) Soccer → La Liga → FC Barcelona → Barcelona vs Madrid (28-02-2026) = $50
E) Soccer → La Liga → FC Barcelona → Barcelona vs Madrid → VIP Zone = $250

Final applied prices must resolve as:

* VIP Zone → **$250**
* Event (Barcelona vs Madrid) → **$50**
* Team (FC Barcelona) → **$150**
* Tournament (La Liga) → **$100**
* All other Soccer tickets → **$200**

---

### **Functional Requirements**

1. Allow storing mark-up values at each hierarchy level:

   * sport
   * tournament
   * team (if applicable)
   * event
   * ticket category

2. Implement mark-up resolution logic that:

   * Traverses from ticket category upward
   * Applies the **nearest defined mark-up**

3. Ensure:

   * Non-team sports (Formula 1, MotoGP) skip the Team level
   * Existing booking and pricing logic is not broken
   * Backward compatibility is preserved

---

### **Non-Functional Requirements**

* Do NOT hardcode sport types
* Do NOT duplicate pricing logic
* Keep implementation modular
* Ensure performance is not degraded
* Validate data integrity (no conflicting rows)

---

### **Deliverables Expected from AI Agent**

* Updated database schema (if needed)
* Updated pricing calculation logic
* Updated admin UI logic for mark-up entry
* Unit-testable mark-up resolution function
* No regression in current ticket booking flow

---