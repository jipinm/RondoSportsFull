# Currency Conversion Testing Guide

## Quick Test Steps

### 1. Start the Frontend Application
```bash
cd frontend
npm run dev
```

### 2. Navigate to a Tickets Page
- Go to http://localhost:5173
- Browse to any event
- Click on an event to view tickets
- URL pattern: `/events/{eventId}/tickets`

### 3. Verify Currency Conversion Display

#### Expected Behavior on Tickets Page:

**If tickets are in non-USD currency (e.g., EUR, GBP):**
```
✅ Original price displayed (e.g., "EUR 150.00")
✅ USD conversion shown below in gray (e.g., "(USD 174.26)")
✅ Both prices visible on each ticket card
```

**If tickets are already in USD:**
```
✅ Only USD price displayed
✅ No duplicate USD conversion shown
```

**If currency API fails:**
```
✅ Original price displayed
✅ No USD conversion shown
✅ No error message to user
✅ Booking flow continues normally
```

### 4. Test Cart Panel

**Steps:**
1. Click "Add Ticket" on any ticket
2. Cart panel opens on the right

**Expected:**
- If conversion active: `USD 174.26 (EUR 150.00)`
- If no conversion: `EUR 150.00` (original only)
- Subtotal calculated in USD if conversion available
- Order Total in USD if conversion available

### 5. Test Checkout Flow

**Steps:**
1. In cart panel, click "Continue to checkout"
2. Complete login/registration
3. Fill in guest details
4. Proceed to payment page

**Expected on Payment Page:**
- Amount to pay is in USD (if conversion was available)
- Stripe checkout processes payment in USD
- Booking created with USD amount

### 6. Verify Browser Console

**Open Developer Tools (F12) and check:**

✅ No errors related to currency conversion
✅ Console may show: Currency conversion info (optional logging)
✅ Frankfurter API calls visible in Network tab

### 7. Test Fallback Scenarios

#### Test API Failure:
1. Open DevTools → Network tab
2. Block requests to `api.frankfurter.dev`
3. Refresh tickets page
4. **Expected:** Tickets show in original currency only, no errors

#### Test Same Currency:
1. Find or create event with USD tickets
2. View tickets page
3. **Expected:** Only USD shown, no conversion text

## Manual API Test

You can test the Frankfurter API directly:

```bash
curl "https://api.frankfurter.dev/v1/latest?from=EUR&to=USD"
```

**Expected Response:**
```json
{
  "amount": 1,
  "base": "EUR",
  "date": "2026-01-17",
  "rates": {
    "USD": 1.1617
  }
}
```

## Debugging Tips

### If prices don't convert:

1. **Check ticket currency:**
   - Open browser console
   - Look for ticket data in Network tab
   - Verify `currency_code` field exists

2. **Check API response:**
   - Look for Frankfurter API calls in Network tab
   - Verify response has `rates.USD` field
   - Check for API errors (status 4xx/5xx)

3. **Check hook state:**
   - Add console.log in `useCurrencyConversion` hook
   - Verify `hasConversion` is true
   - Verify `exchangeRate` is a valid number

### Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| No USD price shown | Tickets already in USD | Expected behavior |
| USD price same as original | Exchange rate is 1:1 | Check if currencies are same |
| No conversion happening | API blocked/failed | Check Network tab for API errors |
| TypeScript errors | Missing type definitions | Run `npm install` |

## Verification Checklist

- [ ] Tickets page loads without errors
- [ ] Original prices displayed correctly
- [ ] USD prices shown when currency is not USD
- [ ] Cart panel shows USD calculations
- [ ] Checkout flow preserves currency data
- [ ] Payment processes in USD
- [ ] Fallback works when API fails
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Booking confirmation shows correct amounts

## Sample Test Data

### EUR Event:
- Original: EUR 100.00
- Expected USD: ~USD 116.00 (varies by exchange rate)

### GBP Event:
- Original: GBP 85.00
- Expected USD: ~USD 107.00 (varies by exchange rate)

### USD Event:
- Original: USD 120.00
- Expected: USD 120.00 (no conversion)

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. ✅ Check browser console for errors
3. ✅ Test complete booking flow end-to-end
4. ✅ Verify Stripe payment amount is correct
5. ✅ Check booking confirmation email (if applicable)
6. ✅ Review implementation documentation

## Support

If you encounter issues:

1. Check `CURRENCY_CONVERSION_IMPLEMENTATION.md` for details
2. Review browser console for error messages
3. Verify Frankfurter API is accessible
4. Check TypeScript compilation errors

---

**Test Date:** January 17, 2026
**Status:** Ready for Testing
