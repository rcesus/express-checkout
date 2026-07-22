# ExpressCheckout Recurring Wallet Sample App - PRD

## Overview

A sample application demonstrating the ExpressCheckout component's autopay mode for recurring subscription creation across three distinct personas: HOA dues (open-ended), preschool tuition (open-ended), and field service installments (fixed-term). The app showcases component-driven subscription creation with flexible frequency and scheduling options for sales demonstrations.

## MVP Requirements

### Requirement 1: Persona Toggle
Display a toggle or segmented control on the page allowing users to switch between three personas:
- HOA Dues
- Preschool Tuition
- Field Service Installments

Toggling between personas updates all visible amounts, frequencies, and default scheduling dates.

### Requirement 2: HOA Dues Persona
- Amount: $525/month
- Default frequency: Monthly
- Default start date: Today
- Default end date: Until Cancelled
- Customer creation: Not required (HOA can pay anonymously)
- Subscription creation: Component autopay mode with `untilCancel: true`

### Requirement 3: Preschool Tuition Persona
- Amount: $1500/month
- Default frequency: Monthly
- Default start date: Today
- Default end date: Until Cancelled
- Customer creation: Required (via API with address)
- Subscription creation: Component autopay mode with `untilCancel: true`

### Requirement 4: Field Service Installments Persona
- Amount: $425/month for 6 months
- Default frequency: Monthly
- Default start date: Today
- Default end date: 6 months from start date (specific date)
- Customer creation: Required (via API with address)
- Subscription creation: Component autopay mode with `endDate` set to 6 months from start date

### Requirement 5: Frequency Selection
Display a dropdown allowing users to select subscription frequency. API supports: `onetime`, `weekly`, `every2weeks`, `monthly`, `every3months`, `every6months`, `annually`, `firstofmonth`, `fifteenthofmonth`, `endofmonth`. For MVP, all three personas default to `monthly`.

### Requirement 6: Start Date Input
Display a date input field allowing users to select the subscription start date. Defaults to today. Used in component config as the initial subscription date.

### Requirement 7: End Date Selection
Display radio buttons or toggle for end date:
- **Until Cancelled**: Open-ended subscription (HOA and Tuition default to this)
- **Specific Date**: Finite subscription with date picker (Field Service defaults to this, 6 months from start date)

When "Until Cancelled" is selected, pass `untilCancel: true` to the component. When "Specific Date" is selected, pass `endDate` with the chosen date to the component.

### Requirement 8: Payer Name Input
Display a text input for payer name (required for Tuition and Field Service, optional for HOA). Used as the `firstName` and `lastName` in customer creation and component configuration.

### Requirement 9: Payer Email Input
Display a text input for payer email (required for Tuition and Field Service, optional for HOA). Used as the `billingEmail` in customer creation and as the `email` in component configuration.

### Requirement 10: ExpressCheckout Component Integration
Integrate the ExpressCheckout component in autopay mode with the following configuration:
- Mode: `autopay`
- Amount: Persona-based (525, 1500, or 425)
- Frequency: User-selected (defaults to `monthly`)
- Start date: User-selected (defaults to today)
- End date: User-selected (`untilCancel: true` or specific `endDate`)
- Customer ID: Required for Tuition and Field Service (from API response), not used for HOA
- Cross-browser Apple Pay: Enabled by default (component won't render on unverified paypoints)

### Requirement 11: Customer Creation API (Tuition & Field Service)
For Tuition and Field Service personas, call POST `/api/customer` with:
```json
{
  "firstName": "{{payer_name_first_part}}",
  "lastName": "{{payer_name_last_part}}",
  "billingEmail": "{{payer_email}}",
  "idempotencyKey": "{{unique_key}}",
  "address": {
    "line1": "456 Oak Street",
    "city": "Portland",
    "state": "OR",
    "postalCode": "97214",
    "country": "US"
  }
}
```

Store the `customerId` from the response and pass it to the component configuration.

### Requirement 12: Session Credential Storage
- **Private token (secret)**: Encrypted in an httpOnly cookie
- **Public token**: Stored in memory (JavaScript variable)
- Both tokens are required for API calls (private in header, public for component config)

### Requirement 13: Domain Verification File
The apple-developer-merchantid-domain-association file must exist in the project's `.well-known/` directory on the deployed domain (Vercel). Users must verify their Payabli paypoint with the Vercel domain (add domain to paypoint/org) before the component will render the Apple Pay button.

### Requirement 14: Paypoint Setup Prerequisite
Users must complete domain verification at their Payabli paypoint before using this app. The domain verification file is pre-deployed; users only need to add the Vercel domain to their paypoint in the Payabli dashboard.

### Requirement 15: Responsive Design
The page layout should be responsive across mobile, tablet, and desktop viewports. The gear icon (settings modal) should be positioned in the top right.

### Requirement 16: Settings Modal (Gear Icon)
A gear icon in the top right corner opens a modal allowing users to paste their public and private API tokens. These are stored as described in Requirement 12.

---

## Component Configuration Examples

### HOA Dues (Autopay)
```javascript
{
  mode: "autopay",
  amount: 52500, // $525.00 in cents
  frequency: userSelectedFrequency, // defaults to "monthly"
  startDate: userSelectedStartDate, // defaults to today
  untilCancel: true, // for open-ended subscriptions
  crossBrowserApplePay: true
}
```

### Preschool Tuition (Autopay)
```javascript
{
  mode: "autopay",
  amount: 150000, // $1500.00 in cents
  customerId: customerIdFromApi, // required
  frequency: userSelectedFrequency, // defaults to "monthly"
  startDate: userSelectedStartDate, // defaults to today
  untilCancel: true, // for open-ended subscriptions
  email: payerEmail,
  crossBrowserApplePay: true
}
```

### Field Service Installments (Autopay)
```javascript
{
  mode: "autopay",
  amount: 42500, // $425.00 in cents
  customerId: customerIdFromApi, // required
  frequency: userSelectedFrequency, // defaults to "monthly"
  startDate: userSelectedStartDate, // defaults to today
  endDate: userSelectedEndDate, // 6 months from start by default
  email: payerEmail,
  crossBrowserApplePay: true
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / User                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ (HTTP/HTTPS)
                       │
    ┌──────────────────┴──────────────────┐
    │                                     │
    ▼                                     ▼
┌─────────────────────┐         ┌──────────────────────┐
│  Sample App         │         │  Payabli APIs        │
│  (React/Next.js)    │         │  (Sandbox/Prod)      │
│                     │         │                      │
│ • Persona toggle    │◄────────│ • POST /customer     │
│ • Frequency input   │◄────────│ • POST /subscription │
│ • Start date input  │◄────────│ • (Component calls   │
│ • End date selector │         │    subscription/add) │
│ • Payer name/email  │         │                      │
│ • Settings modal    │         └──────────────────────┘
│ • ExpressCheckout   │
│   component wrapper │
│                     │
│ Token storage:      │
│ • httpOnly cookie   │
│ • Memory var        │
│                     │
│ Domain verification:│
│ • .well-known file  │
└─────────────────────┘
```

---

## Data Flow

### HOA Dues
```
1. User selects HOA persona
2. Page displays: $525/month, frequency dropdown (monthly), start date (today), end date (Until Cancelled selected)
3. User updates optional: frequency, start date, end date
4. User enters payer name and email
5. User clicks "Pay with ExpressCheckout"
6. Component renders with autopay config (no customer ID needed)
7. User selects payment method (card, Apple Pay, etc.)
8. Component performs $0.01 auth/void verification
9. Component calls POST /Subscription/add directly with autopay config
10. Subscription created in Payabli
11. User receives confirmation
```

### Preschool Tuition
```
1. User selects Tuition persona
2. Page displays: $1500/month, frequency dropdown (monthly), start date (today), end date (Until Cancelled selected)
3. User updates optional: frequency, start date, end date
4. User enters payer name and email
5. App calls POST /api/customer with name, email, and address
6. Customer created in Payabli; customerId returned
7. User clicks "Pay with ExpressCheckout"
8. Component renders with autopay config + customerId
9. User selects payment method
10. Component performs $0.01 auth/void verification
11. Component calls POST /Subscription/add with autopay config + customerId
12. Subscription created in Payabli, linked to customer
13. User receives confirmation
```

### Field Service Installments
```
1. User selects Field Service persona
2. Page displays: $425/month for 6 months, frequency dropdown (monthly), start date (today), end date (Specific Date showing 6 months out)
3. User updates optional: frequency, start date, end date
4. User enters payer name and email
5. App calls POST /api/customer with name, email, and address
6. Customer created in Payabli; customerId returned
7. User clicks "Pay with ExpressCheckout"
8. Component renders with autopay config + customerId + endDate
9. User selects payment method
10. Component performs $0.01 auth/void verification
11. Component calls POST /Subscription/add with autopay config + customerId + endDate (6 months from start)
12. Subscription created in Payabli, linked to customer, will auto-cancel after final payment
13. User receives confirmation
```

---

## Design Specifications

### Page Layout
- **Header**: Simple logo/title area
- **Persona toggle**: Segmented control (HOA / Tuition / Field Service) centered near top
- **Form section**: Stacked layout on mobile, left column on desktop
  - Amount display (read-only, updates with persona)
  - Frequency dropdown
  - Start date input (date picker)
  - End date selector (radio buttons or toggle: "Until Cancelled" or "Specific Date" with date picker)
  - Payer name input
  - Payer email input
  - CTA button: "Pay with ExpressCheckout"
- **Component section**: Right column on desktop, below form on mobile
  - ExpressCheckout component embedded
- **Settings**: Gear icon (top right) opens modal for token entry

### Form Field Behavior
- **Frequency**: Dropdown with all supported frequencies; defaults to `monthly` for MVP
- **Start date**: Date input; defaults to today's date
- **End date**: 
  - Radio/toggle for "Until Cancelled" vs "Specific Date"
  - If "Until Cancelled": shows "Open-ended subscription"
  - If "Specific Date": shows date picker, defaults to 6 months from start date for Field Service, no restriction for others
- **Payer name**: Optional for HOA, required for Tuition and Field Service
- **Payer email**: Optional for HOA, required for Tuition and Field Service
- **No editable fields beyond**: Frequency, start date, end date, payer name, and payer email

### Colors & Styling
- Use a clean, minimal design suitable for B2B demo
- Primary CTA button in Payabli brand color (or equivalent)
- Responsive typography with clear visual hierarchy

---

## Cross-Browser Apple Pay Setup

### Overview
The ExpressCheckout component includes native Apple Pay support across Safari on iOS, macOS, and other supported browsers. To enable this, domain verification is required.

### Domain Verification File
- **File**: `apple-developer-merchantid-domain-association`
- **Location**: `.well-known/` directory at project root
- **Format**: Hex-encoded signature (provided in project)
- **Deployment**: Already deployed on Vercel; users must verify at their Payabli paypoint

### User Steps to Enable Apple Pay
1. Log into Payabli dashboard
2. Navigate to paypoint settings
3. Add the Vercel domain (e.g., `your-app.vercel.app`) to the paypoint domain list
4. Complete verification (verification endpoint checks for the domain association file)
5. Cross-browser Apple Pay now renders in the component

### Component Configuration
Set `crossBrowserApplePay: true` in component config. The component will render the Apple Pay button only on verified paypoints.

---

## API Integration Details

### POST /api/customer
**Purpose**: Create a customer record for Tuition and Field Service personas.

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "billingEmail": "john@example.com",
  "idempotencyKey": "unique-id-per-request",
  "address": {
    "line1": "456 Oak Street",
    "city": "Portland",
    "state": "OR",
    "postalCode": "97214",
    "country": "US"
  }
}
```

**Response**:
```json
{
  "customerId": "CUST_...",
  "firstName": "John",
  "lastName": "Doe",
  "billingEmail": "john@example.com",
  "createdAt": "2026-07-22T..."
}
```

**Notes**:
- `idempotencyKey` prevents duplicate customers if request is retried
- `firstName` and `lastName` are matched against payment method name for verification
- Address info is stored for invoicing and compliance
- Customer record persists; same customer can be used for multiple subscriptions

### Component Autopay Mode
The ExpressCheckout component in `autopay` mode:
1. Accepts user payment method details
2. Performs a $0.01 authorization and void to verify the payment method
3. Calls POST /Subscription/add with the frequency, amount, start date, and end date
4. Returns success/error to the app

**Component does NOT require** a separate server-side subscription creation call; all subscription logic is handled component-side.

---

## Token Management

### Private Token (Secret)
- Stored in an encrypted httpOnly cookie
- Cannot be accessed by JavaScript
- Sent automatically with API requests via cookie
- Used for server-side API calls (e.g., POST /customer)

### Public Token
- Stored in memory (JavaScript variable)
- Accessible to the component
- Passed to the component configuration for API authentication

### Settings Modal
Users enter both tokens via the settings modal (gear icon, top right). Tokens are stored securely as described above.

---

## Testing & Validation Notes

### Sandbox Testing
During week 1, validate:
1. Customer creation with address info successfully stores and retrieves customer records
2. Customer name matching works as expected (first/last name vs payment method name)
3. All three subscription modes (HOA, Tuition, Field Service) create subscriptions with correct frequencies and end dates
4. Frequency enum alignment: API accepts all listed frequencies; component can handle them

### Future Personas
If adding personas with non-monthly frequencies:
- Component supports: `onetime`, `weekly`, `every2weeks`, `monthly`, `every3months`, `every6months`, `annually`, `firstofmonth`, `fifteenthofmonth`, `endofmonth`
- API supports the same list
- No changes needed to component or API; just update persona defaults

---

## Deployment

### Vercel
- Deploy to Vercel (e.g., `your-app.vercel.app`)
- Ensure `.well-known/apple-developer-merchantid-domain-association` file is included in build
- Users must add this domain to their Payabli paypoint to enable Apple Pay

### Environment Variables
- `NEXT_PUBLIC_PAYABLI_PUBLIC_KEY`: Payabli public token (set by user in settings modal, or as env var)
- `PAYABLI_PRIVATE_KEY`: Payabli private token (set by user in settings modal, or as env var via server)

---

## Success Criteria

- [x] Three personas toggle and update all visible amounts/frequencies/dates
- [x] Frequency, start date, and end date are user-editable with persona-based defaults
- [x] Payer name and email inputs work correctly for Tuition and Field Service
- [x] Customer creation API call includes address info for Tuition and Field Service
- [x] HOA persona creates subscription without customer record
- [x] Tuition and Field Service personas create customer, then subscription via component autopay
- [x] Field Service subscriptions auto-cancel after 6 months
- [x] Component renders successfully on verified paypoints with cross-browser Apple Pay enabled
- [x] Domain verification file is deployed and accessible
- [x] Settings modal accepts and stores tokens securely
- [x] Responsive design works on mobile, tablet, and desktop
