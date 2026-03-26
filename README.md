# TriCore Events

TriCore Events is a full-stack sports event operations platform for corporate tournaments. It replaces ad-hoc spreadsheets, chat-based coordination, and manual payment follow-up with a single application for event publishing, registrations, payment proof review, scheduling, accounting, reporting, contact forwarding, and admin operations.

## Current Functional Scope

### Public Website
- Home, About, Events, Contact, and Dashboard entry points
- Published event listing with registration status, capacity, venue, dates, and fees
- Event detail pages with live registration form and published match schedule
- Contact form with configurable email forwarding

### User Authentication and Profile
- Google sign-in for participant users
- JWT-protected user dashboard
- User payout and refund details storage for UPI and bank accounts
- Existing registration lookup by signed-in email and selected event

### Registration and Payment
- Free-event registration with immediate confirmation
- Paid-event registration flow with redirect to a dedicated payment page
- Dynamic payment methods loaded from admin settings:
  - QR code
  - UPI ID
  - bank details
  - manual payment proof upload
- Manual screenshot upload for payment proof review
- Registration state separation:
  - `Registered`: team submitted, waiting for admin confirmation
  - `Confirmed`: admin verified payment
- Payment state separation:
  - `Pending`
  - `Under Review`
  - `Confirmed`
  - `Failed`
  - legacy `Paid` is normalized to `Confirmed`
- Existing Razorpay order and verification endpoints remain available when Razorpay credentials are configured

### Admin Portal
- Default local admin bootstrap account
- Event create, update, soft-delete, and registration enable/disable
- Registration review screen with payment proof preview, roster details, and confirm action
- Schedule management restricted to admin users
- Knockout bracket generation from confirmed teams only
- Admin user creation with unique username and unique email validation
- Email settings, payment settings, and contact forwarding settings

### Accounting and Reporting
- Transaction ledger for `income` and `expense`
- Scope support:
  - `event`
  - `common`
- Manual transaction create, update, delete
- Auto-recorded income transaction creation when a paid registration is confirmed
- Dashboard totals:
  - total income
  - total expenses
  - net profit
  - bank balance
  - cash balance
  - partner balance
- Reports:
  - event profit/loss
  - income breakdown
  - expense breakdown
  - payment status report
  - timeline report
- CSV export for transactions and reporting endpoints

### Notifications and Settings
- SMTP configuration loaded from DB settings with `.env` fallback
- Contact forwarding recipients loaded from DB settings with `.env` fallback
- Payment settings loaded from DB settings
- Test email action in admin settings
- Notification emails triggered for:
  - new registration submission
  - payment proof submission
  - payment confirmation
  - contact enquiries

## Architecture

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js 18+
- Express
- MongoDB with Mongoose
- Zod request validation
- Nodemailer for SMTP delivery
- Google Auth Library for ID token verification
- Razorpay SDK for optional online payments

## Project Structure

```text
tricore-events/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── data/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── public/
│   │   │   └── user/
│   │   └── utils/
├── server/
│   ├── scripts/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       └── validators/
├── docs/
├── build-deploy.bat
├── deploy-app.bat
├── run-app.bat
└── README.md
```

## Core Data Models

- `User`: Google users, local admin users, payout details, and login metadata
- `Event`: tournament definition, schedule window, fee, team size, and registration settings
- `Registration`: team/contact/player roster for an event
- `Payment`: free, manual, or Razorpay payment record with proof metadata and confirmation data
- `Match`: scheduled fixtures and generated knockout rounds
- `Transaction`: income/expense ledger row with event/common scope and reference document
- `AppSetting`: DB-backed configuration for email, contact forwarding, and payment settings
- `ContactInquiry`: public contact form submissions and forwarding state

## Payment and Registration Workflow

### Free Event
1. User signs in with Google.
2. User opens an event and enters team plus player details.
3. `POST /api/registrations` creates a `Confirmed` registration with a `free` payment record.
4. Notification emails are sent for the registration.

### Paid Event with Manual Proof
1. User signs in with Google.
2. User fills team and player details.
3. Client stores the registration draft and redirects to `/events/:eventId/payment`.
4. Payment page loads configured QR, UPI, and bank details from `/api/payment-settings`.
5. User uploads a payment screenshot.
6. `POST /api/registrations/manual` creates:
   - registration status `Registered`
   - payment status `Under Review` when proof is attached
7. Admin reviews the registration and proof in the Registrations screen.
8. Admin confirms payment from `/api/registrations/:id/confirm-payment`.
9. The system updates:
   - registration status to `Confirmed`
   - payment status to `Confirmed`
   - accounting ledger with an auto registration income transaction
10. Confirmation email is sent to the team with player names and event dates.

### Paid Event with Razorpay
1. User requests `/api/create-order`.
2. Client completes checkout.
3. Client sends payment result to `/api/verify-payment`.
4. Server verifies the signature, creates the registration, and records confirmed income.

## Schedule Workflow

1. Only admins can create or generate matches.
2. Schedule management loads confirmed teams from `/api/matches/event/:eventId/confirmed-teams`.
3. Manual match creation rejects unconfirmed teams.
4. Knockout generation creates bracket rounds until a final is reached.
5. Public event pages and user dashboard display published matches.

## Accounting Transaction Model

### Transaction Types
- `income`
- `expense`

### Transaction Sources
- `manual`: admin-entered ledger transaction
- `payment`: auto-generated from confirmed registration payments

### Transaction Scopes
- `event`: tied to a specific event
- `common`: organization-wide, not tied to an event

### Income Categories
- `registration`
- `sponsorship`
- `advertisement`
- `donation`
- `partner_share`
- `other`
- `other_income`

### Expense Categories
- `venue`
- `equipment`
- `staff`
- `marketing`
- `prize`
- `food`
- `administrative`
- `vendor_payment`
- `organizer_payout`
- `partner_distribution`
- `miscellaneous`
- `other_expense`

### Payment Modes on Transactions
- `online`
- `cash`
- `upi`
- `bank`

## API Summary

### Health and Public
- `GET /api/health`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/matches/:eventId`
- `GET /api/payment-settings`
- `POST /api/contact`

### Auth and User
- `POST /api/auth/google`
- `POST /api/auth/admin/login`
- `GET /api/auth/me`
- `PUT /api/auth/me/payout-details`
- `GET /api/dashboard/me`

### Registrations and Payments
- `POST /api/registrations`
- `POST /api/registrations/manual`
- `GET /api/registrations/me`
- `GET /api/registrations/me/event/:eventId`
- `POST /api/create-order`
- `POST /api/verify-payment`

### Admin Events and Registrations
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/registrations`
- `POST /api/registrations/:id/confirm-payment`

### Admin Matches
- `POST /api/matches`
- `POST /api/matches/generate-knockout`
- `GET /api/matches/event/:eventId/confirmed-teams`

### Admin Accounting and Reports
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/dashboard`
- `GET /api/transactions/reports`
- `GET /api/admin/accounting`
- `GET /api/admin/reports/overview`
- `GET /api/admin/dashboard`

### Admin Settings and Users
- `GET /api/settings/email`
- `PUT /api/settings/email`
- `POST /api/settings/email/test`
- `GET /api/settings/contact-forwarding`
- `PUT /api/settings/contact-forwarding`
- `GET /api/settings/payment`
- `PUT /api/settings/payment`
- `GET /api/auth/admin/users`
- `POST /api/auth/admin/users`
- `POST /api/auth/admin/change-password`

## Environment Configuration

### Server `.env`
- `HOST`
- `PORT`
- `MONGODB_URI`
- `MONGODB_ALLOW_MEMORY_FALLBACK`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_IDS`
- `CONTACT_FORWARD_EMAILS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_TO_RECIPIENTS`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

### Client `.env`
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`

## Local Development

1. Install dependencies from the repo root:
   - `npm install`
2. Start frontend and backend together:
   - `npm run dev`
3. Frontend default URL:
   - `http://localhost:5173`
4. Backend default URL:
   - `http://localhost:5000`

### Windows Helpers
- [run-app.bat](/c:/Works/Tricore/run-app.bat)
- [deploy-app.bat](/c:/Works/Tricore/deploy-app.bat)
- [build-deploy.bat](/c:/Works/Tricore/build-deploy.bat)

## Default Admin Access

The server bootstraps a local admin account if it does not already exist.

- Username: `tricore`
- Password: `tricore`
- Admin portal route: `/admin-portal/login`

## Validation and Test Assets

### Automated Validation Suite
The repository includes a repeatable validation script that:
- creates a dedicated paid validation event
- creates validation users and registrations
- submits manual payment proof
- confirms payments as admin
- seeds 20 manual accounting transactions
- validates update, delete, dashboard, report, and scheduling flows

Run it from the repo root:

```bash
npm run validate:workflow
```

The suite requires the backend API to be running on `http://localhost:5000` unless `VALIDATION_API_URL` is set.

### Workflow Test Document
Detailed manual and automated test procedures are documented in [docs/WORKFLOW_TEST_PLAN.md](/c:/Works/Tricore/docs/WORKFLOW_TEST_PLAN.md).

## Operational Notes

- Email settings and contact forwarding settings are DB-backed and automatically fall back to `.env` defaults.
- Payment settings are DB-backed.
- Duplicate registrations are blocked by event and email, and by event and team name.
- Manual accounting transactions can be edited or deleted. Payment-generated transactions cannot.
- Match generation uses confirmed teams only.
- Soft-deleted events are hidden from normal event listing.
