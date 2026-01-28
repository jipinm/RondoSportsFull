```md
# Currency Conversion Integration — Tickets Page

## Route
```

/events/2b308e1d8d0a43e3bbb56a09954630ea_gnr/tickets

```

---

## Objective
Implement real-time currency conversion to display ticket prices in **USD** while retaining the original currency values. All payment transactions must be processed exclusively in **USD**.

---

## Scope of Enhancement

### Features to Be Added
- Real-time conversion of ticket prices from the local currency to **USD**
- Display of converted USD prices alongside original ticket prices

---

## Currency Conversion Service

### Recommended API
**Frankfurter API**
- Data Source: European Central Bank
- Authentication: Not required
- Cost: Free
- Documentation: https://www.frankfurter.dev

---

### Sample API Endpoint
```

[https://api.frankfurter.dev/v1/latest?from=EUR&to=USD](https://api.frankfurter.dev/v1/latest?from=EUR&to=USD)

````

### Sample API Response
```json
{
  "amount": 1,
  "base": "EUR",
  "date": "2026-01-16",
  "rates": {
    "USD": 1.1617
  }
}
````

---

## Implementation Instructions

1. Call the Frankfurter API at the **top level of the ticket listing logic**.
2. Read the `base` currency and conversion rate from the API response.
3. Convert all ticket prices to **USD** using the returned exchange rate.
4. Display:

   * Original ticket price with its local currency
   * Converted ticket price in **USD**
5. Ensure the payment gateway:

   * Uses the converted **USD amount**
   * Sets the transaction currency strictly to **USD**

---

## Fallback Behavior

* If the currency conversion API request fails or returns an invalid response:

  * Display ticket prices using the existing logic (original currency only)
  * Proceed with the current payment flow without any currency conversion

---

## Notes

* Currency conversion must not block ticket listing or checkout flow.
* API failures should be handled gracefully without user-facing errors.

```
```
