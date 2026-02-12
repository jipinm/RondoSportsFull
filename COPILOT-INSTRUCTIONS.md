# 🧾 Hospitality Scope Change – AI Implementation Instructions

## 📍 Route Affected
`/events/:EventId/tickets` (frontend application)

---

## 🔁 Current Behavior

- After selecting a ticket, a popup asks the user to choose hospitality services.
- Selected hospitalities add extra charges to the ticket price.
- Chefcap icon visibility is based on the `xs2events` API response and logic.

---

## 🎯 Scope Change Requirements

### 1. ❌ Remove Hospitality Pricing Logic
- Completely remove hospitality price calculation and price addition to ticket/cart totals.
- There is **no separate price entity** for hospitality services anymore.
- Ignore any hospitality price fields returned by APIs.

---

### 2. ❌ Remove Hospitality Selection UI
- Remove the hospitality selection popup/modal entirely.
- Users must not select hospitalities manually.

---

### 3. ✅ Hospitality Is Part of the Ticket
- Hospitalities are now **inclusive** with the ticket.
- Admin assigns hospitalities to ticket categories.
- Users can only **view** assigned hospitalities.

---

### 4. 🎩 Chefcap Icon Display Logic
- Display the chefcap icon **only** for ticket categories that have **at least one assigned hospitality** at any hierarchical level.
- Icon visibility must be based on **hospitality assignment**, not on old `xs2events` API response based logic.

---

### 5. 📋 Hospitality List on Hover
- On hovering the chefcap icon, display a **read-only list** of assigned hospitalities.
- The list must:
  - Be informational only
  - Have no selection controls
  - Show no price values

---

### 6. 🧩 Data Handling Rules
- Use hospitality assignment data from the public API response hierarchy from the #api application.
- If needed, refer to the **latest-database-tables-and-data.sql** for hospitality assignments.
- Do not depend on legacy hospitality pricing fields.

---

## 🌐 Backend API Scope Change (Public APIs)

- Develop or update **public APIs** in the `#api` application to support this new hospitality model.
- Refer to the **latest-database-tables-and-data.sql** if required.
- APIs must:
  - Return assigned hospitalities for ticket categories
  - Support hierarchical hospitality assignments
  - Exclude hospitality pricing fields

---

## 🧹 Code Cleanup
- Remove:
  - Hospitality price states
  - Hospitality selection handlers
  - Unused hospitality-related props
  - Deprecated API fields related to hospitality pricing

---

## 🛡️ Non-Functional Requirements
- Do not affect:
  - Ticket base pricing
  - Mark-up pricing logic
  - Currency switching logic
  - Exchange rate calculation logic
  - Cart logic
  - Checkout flow
  - Ticket quantity logic
- Ensure backward compatibility for unrelated features.

---

## ✅ Expected Final Behavior

- Hospitalities are:
  - Included with tickets
  - Not selectable
  - Not priced separately
  - Displayed only as informational items on hover

- Chefcap icon:
  - Appears only if at least one hospitality is assigned
  - Shows hospitality list on hover

---

## 🏁 Objective

Implement the new hospitality model where hospitality services are:

- Admin-assigned  
- Ticket-inclusive  
- Price-independent  
- Read-only for users  
- Displayed via chefcap hover tooltip  
