# TriCore Workflow Test Plan

This document defines the expected workflows and validation steps for the current TriCore Events implementation.

## Scope

The plan covers:
- public event discovery
- user sign-in and registration
- free and paid registration flows
- payment proof submission and admin confirmation
- email and contact forwarding settings
- schedule management and knockout generation
- accounting ledger, dashboard, and reports
- admin user management
- reports and exports

## Prerequisites

- Backend API running at `http://localhost:5000`
- Frontend running at `http://localhost:5173` or backend-served production build
- MongoDB reachable from the backend
- SMTP configured in DB settings or `server/.env`
- Google OAuth configured for live browser sign-in tests
- At least one admin account available

## Recommended Test Order

1. Health check and settings
2. Event creation
3. Registration flow
4. Admin payment confirmation
5. User dashboard verification
6. Schedule management
7. Accounting module
8. Contact forwarding
9. Reports and CSV export
10. Admin user management

## Automated Validation Suite

Use the automated suite when you need a repeatable baseline with seeded accounting entries and paid registrations.

```bash
npm run validate:workflow
```

The automated suite performs the following:
- verifies `/api/health`
- creates a paid validation event
- creates validation users
- updates and restores payment settings for manual proof testing
- submits two paid registrations with receipt images
- confirms both payments as admin
- generates a knockout bracket from confirmed teams
- creates 20 manual accounting transactions
- validates accounting update and delete behavior
- fetches dashboard and report summaries
- sends a test SMTP email

## Manual Test Cases

### 1. Health and Configuration
Expected result:
- `/api/health` returns `success: true`
- database mode and host are visible
- admin settings screens load without errors

Steps:
1. Open the app.
2. Open the admin portal.
3. Verify Email, Contact Forwarding, and Payments settings load values from DB or `.env` fallback.
4. Use `Send Test Email`.

Pass criteria:
- SMTP status is ready
- test email returns success
- recipients are visible in settings

### 2. Event Creation and Update
Expected result:
- admin can create and edit both free and paid events

Steps:
1. Sign in as admin.
2. Create an event with registration enabled.
3. Set future registration deadline.
4. Save and reopen the event.
5. Update venue or fee and save again.

Pass criteria:
- event appears in public listing
- edited values are reflected in public detail page

### 3. Existing Registration Retrieval
Expected result:
- when a user signs in with the same email used in registration, the event page loads saved roster and status

Steps:
1. Register for an event using a Google account.
2. Sign out and sign back in with the same account.
3. Reopen the same event.

Pass criteria:
- player list is loaded automatically
- contact details are prefilled
- duplicate submit is blocked
- payment status is visible

### 4. Free Registration Flow
Expected result:
- free event registration is confirmed immediately

Steps:
1. Open a free event.
2. Add team and player details.
3. Submit registration.

Pass criteria:
- registration status becomes `Confirmed`
- payment record is `Confirmed` with method `free`
- registration appears in user dashboard
- admin registration screen shows the team

### 5. Paid Manual Registration Flow
Expected result:
- user is redirected to the payment page after saving players

Steps:
1. Open a paid event.
2. Add all required team and player details.
3. Submit registration.
4. Verify redirect to `/events/:eventId/payment`.
5. Confirm the payment page displays the currently configured methods:
   - QR code
   - UPI ID
   - bank details
6. Upload a payment receipt image and submit.

Pass criteria:
- registration is created with status `Registered`
- payment is created with status `Under Review`
- proof image preview is shown before submit
- proof submission success message is displayed
- proof email is sent to the configured admin inbox

### 6. Admin Payment Confirmation
Expected result:
- admin can review and confirm manual payments

Steps:
1. Open `Admin Portal > Registrations`.
2. Filter by the target event.
3. Open the registration card.
4. Review roster, contact details, payment reference, and receipt image.
5. Choose accounting mode.
6. Confirm payment.

Pass criteria:
- registration status changes to `Confirmed`
- payment status changes to `Confirmed`
- confirmation timestamp is stored
- user confirmation email is triggered
- auto registration income transaction is created

### 7. User Dashboard After Confirmation
Expected result:
- confirmed registration and related matches are visible to the user

Steps:
1. Sign in as the registered user.
2. Open the dashboard.
3. Open the event again.

Pass criteria:
- registration is listed in dashboard
- payment status is `Confirmed`
- event page still shows saved roster

### 8. Schedule Management
Expected result:
- only confirmed teams can be used for fixtures

Steps:
1. Confirm at least two registrations for the same event.
2. Open `Admin Portal > Matches`.
3. Select the event.
4. Verify only confirmed teams appear.
5. Generate a knockout bracket.
6. Optionally create a manual match.

Pass criteria:
- unconfirmed teams do not appear
- bracket rounds are created automatically
- public event page shows published matches
- user dashboard shows match list for the registered event

### 9. Accounting Module
Expected result:
- manual and payment-based transactions are both visible and summarized correctly

Scenarios to validate:
- create manual income
- create manual expense
- create event-scoped transaction
- create common-scoped transaction
- update manual transaction
- delete manual transaction
- view payment-generated registration income
- verify bank, cash, and partner balances
- verify event profit/loss
- verify date filtering
- verify CSV export

Pass criteria:
- totals update immediately after create/update/delete
- payment-generated rows are read-only
- category validation blocks invalid type/category combinations
- dashboard and reports reflect seeded data

### 10. Contact Forwarding
Expected result:
- public contact submissions are stored and forwarded

Steps:
1. Configure forwarding recipients in admin settings.
2. Submit a public contact form.

Pass criteria:
- inquiry is stored in DB
- forwarding status updates
- email is sent to configured recipients when SMTP is ready

### 11. Admin User Management
Expected result:
- local admin users enforce unique username and unique email rules

Steps:
1. Open `Admin Portal > Users`.
2. Create a new admin with unique username and email.
3. Attempt to create another admin using the same username or same email.

Pass criteria:
- first creation succeeds
- duplicate username is rejected
- duplicate email is rejected

### 12. Reports and Exports
Expected result:
- report pages aggregate current event, registration, and payment state correctly

Steps:
1. Open Reports.
2. Review overview metrics.
3. Export accounting or overview CSV.

Pass criteria:
- report totals align with ledger data
- CSV download contains the expected columns and values

## Accounting Validation Set

The automated suite seeds 20 common manual transactions covering every supported category and leaves them in the system for review.

### Seeded validation entries
1. Event registration income: offline registration batch
2. Event sponsorship income: Apex title sponsorship
3. Event advertisement income: boundary board advertisement
4. Common donation income: supporter contribution
5. Common partner share income: partner revenue share received
6. Common other income: training clinic revenue
7. Common other_income income: merchandise margin
8. Event venue expense: ground booking advance
9. Event equipment expense: sports equipment purchase
10. Event staff expense: umpire and scorer fees
11. Common marketing expense: social media promotion
12. Event prize expense: winner trophy and medals
13. Event food expense: refreshments for teams
14. Common administrative expense: office stationery and printing
15. Common vendor payment expense: website support vendor payout
16. Event organizer payout expense: event organizer settlement
17. Common partner distribution expense: partner share distributed
18. Common miscellaneous expense: emergency runner logistics
19. Common other_expense expense: unexpected compliance filing
20. Common sponsorship income: local sponsor add-on support

### Income categories covered
- registration
- sponsorship
- advertisement
- donation
- partner_share
- other
- other_income

### Expense categories covered
- venue
- equipment
- staff
- marketing
- prize
- food
- administrative
- vendor_payment
- organizer_payout
- partner_distribution
- miscellaneous
- other_expense

### Additional validations
- all payment modes are exercised: `online`, `cash`, `upi`, `bank`
- both scopes are exercised: `event`, `common`
- one temporary manual transaction is created and deleted
- one seeded transaction is updated to validate edit flow
- confirmed registration payments create automatic `payment` source income rows

## Troubleshooting Checklist

### Registration problems
- verify event registration deadline is still open
- verify player count meets event rules
- verify duplicate email or team registration does not already exist
- verify user is signed in

### Email problems
- verify SMTP host, port, sender, and app password
- verify `SMTP_FROM_EMAIL` and DB email settings are aligned
- use admin `Send Test Email` before testing registration flow

### Accounting problems
- verify admin auth token is valid
- verify event-scoped rows include `eventId`
- verify category matches the selected transaction type
- verify amount is greater than zero

### Schedule problems
- verify at least two teams are payment-confirmed
- verify the selected event is the one used during confirmation

## Suggested Regression Checklist After Any Change

1. Run `npm run build`
2. Run `npm run validate:workflow`
3. Open the admin registrations screen and verify a confirmed team is visible
4. Open admin accounting and verify manual plus payment rows are present
5. Open a user dashboard and verify registration plus schedule visibility
