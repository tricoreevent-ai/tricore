# TriCore Events User Manual

This manual explains the TriCore Events system in simple language. It is written for people who may not be comfortable with computers or web applications. Use it as a day-to-day guide for operating the website and the admin portal.

Last updated: 27 March 2026

This version includes the current admin overview, Google sign-in event access, the expanded match workspace, audience campaigns, and the new MongoDB backup information tool.

## 1. Overview of the Application

TriCore Events is a sports event management platform. It helps the team do three main things:

1. Show events to the public on the website
2. Collect registrations and payments from participants
3. Help the internal team manage events, schedules, accounts, reports, and settings

### Main people who use the system

**Public User / Participant**
- Visits the website
- Reads event details
- Registers for an event
- Makes payment if the event is paid
- Checks registration and payment status

**Admin**
- Has broad control of the full admin portal
- Creates and edits events
- Reviews registrations and payments
- Manages roles, settings, reports, and alerts

**Operations User**
- Focuses mainly on event operations
- Works with Overview, Events, Registrations, Matches, and Reports

**Accounting User**
- Focuses mainly on money-related work
- Records transactions
- Reviews ledger entries
- Manages categories
- Uses finance reports

## 2. Public Website Navigation

The public website normally shows these top menu items:

- `Home`
- `About`
- `Corporate`
- `Events`
- `Contact`
- `Admin Portal`

After a participant signs in with Google, the header may also show `Dashboard`.

Some pages, such as the sponsor / partner page, are usually opened only through a shared link and may not appear in the main public menu.

### What each public page does

**Home**
- Shows the brand, banners, featured events, process steps, gallery sections, and partner highlights
- This is the main first page of the website

**About**
- Explains the TriCore story, experience, partners, and gallery content

**Corporate**
- Shows TriCore corporate-event services, service packages, process flow, and contact actions
- Used when a company wants to discuss offsites, employee engagement, meetings, launches, or other event services

**Events**
- Shows all visible sports events
- Upcoming events are shown first
- Events may show statuses like `Registration Open`, `Coming Soon`, `Registration Closed`, or `Event Completed`

**Event Details**
- Full event details unlock after Google sign-in
- Shows event information cards, match schedule, and the participation panel
- If registration is open, the user sees the registration form
- If the event is Coming Soon, the user sees the `Notify Later` interest form

**Contact**
- Shows email, website, partner names, and contact numbers
- Contains the `Reach Out` form where users can send an enquiry

**Dashboard**
- Available after user sign-in
- Shows registered events, payment statuses, upcoming matches, and refund / payout details

**Admin Portal**
- Opens the login screen for internal staff

**Partner Access / Sponsorship Page**
- Usually opened through a direct shared link from the admin team
- Shows sponsorship packages, brand visibility details, and partner contact actions

## 3. Admin Portal Navigation Guide

After login, the admin portal shows a main menu. Depending on the user role, some people may see all menu items and some may see only a few.

Main menu items:

- `Overview`
- `Events`
- `Registrations`
- `Matches`
- `Accounting`
- `Reports`
- `Users`
- `Settings`
- `User Manual`

If a menu item is missing, it usually means the user role does not have permission for that page.

The `User Manual` menu is available to every signed-in admin so help is always available inside the portal.

### 3.1 Overview

Purpose:
- Gives a quick summary of the whole system

What the user sees:
- A top overview area showing the signed-in role and open alert count
- Summary cards such as total events, registrations, revenue, and alerts
- Revenue trend chart
- Participation mix
- Quick navigation tiles
- Payment status summary
- A 30-day planning calendar showing events, holidays, and sports fixtures
- Recent payments
- Recent alerts
- Sponsorship share link for partner outreach
- Upcoming event window

Use this page when:
- You want to quickly understand what needs attention today
- You want to see upcoming events and open alerts in one place
- You want a direct partner / sponsorship link without exposing it in the main public menu

### 3.2 Events

Purpose:
- Manage all events from one page

What the user sees:
- `Create Event` or `Edit Event` form
- `Event Catalog` filter section with date range and visibility options
- `List` view for compact event records
- `Calendar` view for date-based planning
- `Interested Users` section for Coming Soon events

Main actions on this page:
- Create a new event
- Edit an existing event
- Hide or unhide an event
- Enable or disable registration
- Delete an event if it has no dependent records
- View `Notify Later` contacts
- Send event emails manually to interested contacts

### 3.3 Registrations

Purpose:
- Review all registrations and payment states

What the user sees:
- Filter area with date range, event, and payment state
- Registration summary line
- Expandable registration cards
- Payment status labels such as `Pending`, `Under Review`, `Confirmed`, or `Failed`
- Export options

Use this page when:
- You want to find new registrations
- You want to check payment proof
- You want to confirm a registration
- You want to export registration data

### 3.4 Matches

Purpose:
- Run the full match operations workspace for confirmed teams

What the user sees:
- Event selector
- Workspace tabs such as:
  - `Match Configuration`
  - `Fixture Management`
  - `AI Fixture Lab`
  - `Points System`
  - `Team Registration`
  - `Player Management`
  - `Match Results Entry`
  - `Standings and Rankings`
  - `Knockout and Finals Setup`
  - `Notifications and Alerts`
  - `Calendar View`
- Manual fixture tools
- Auto-generation tools
- Team and player profile areas
- Results and standings views

Use this page when:
- Teams are confirmed and you need to configure the tournament structure
- You want to generate or edit fixtures
- You need to record results, standings, knockout paths, and schedule notifications

### 3.5 Accounting

Purpose:
- Record money movement and maintain transaction data

What the user sees:
- Three internal views:
  - `Record Transaction`
  - `Transaction Ledger`
  - `Manage Categories`
- Accounting summary cards and business snapshot after filters are applied
- Ledger filters and export options
- Print actions for invoices or bills

Important note:
- Financial reporting is in the main `Reports` menu
- `Accounting` is mainly for entering and reviewing transaction records
- Depending on security settings, updates or deletions may require an email OTP

### 3.6 Reports

Purpose:
- View financial, operational, and alert reporting

What the user sees:
- Tabs such as:
  - `Overview`
  - `Finance`
  - `Activity`
  - `Alerts`
- Date filters before report data is loaded
- Searchable, paginated report tables
- Export buttons

Use this page when:
- You need business summaries
- You want Profit & Loss information
- You want operational history
- You want to review and acknowledge alerts

### 3.7 Users

Purpose:
- Manage audience communication and internal access rights

What the user sees:
- Tabs:
  - `Audience Users`
  - `Campaigns`
  - `Admin Accounts`
  - `Create Admin User`
  - `Edit Admin User`
  - `Create Roles`
  - `Modify Role Access`
  - `Change Password`

Use this page when:
- You want to search registered users or interested contacts
- You want to export audience data or send reminder emails
- You want to build campaigns and manage templates or approvals
- A new staff member needs admin access
- A role needs to be updated
- A password needs to be changed

### 3.8 Settings

Purpose:
- Control system-wide configuration

What the user sees:
- Tabs such as:
  - `Contact Forwarding`
  - `Email`
  - `Invoice`
  - `Appearance`
  - `Banners`
  - `Gallery`
  - `Website`
  - `Backups`
  - `Security`
  - `Payments`

Use this page when:
- You want to change email routing
- You want to update invoice settings
- You want to control banners, galleries, or public website values
- You want to manage backups, OTP approval, or payment settings

### 3.9 User Manual

Purpose:
- Open the built-in help guide inside the admin portal

What the user sees:
- An embedded help page inside the portal
- A button to open the full-screen help file in a separate tab

Use this page when:
- You are onboarding a new staff member
- You want to check the workflow for a task before doing it
- You want a printable version of the guide during training

## 4. Simple Menu Map

```text
Public Website
├── Home
├── About
├── Corporate
├── Events
│   └── Event Details (full access after Google sign-in)
│       ├── Match Schedule
│       ├── Register Now
│       └── Notify Later
├── Contact
├── Dashboard (after sign-in)
└── Admin Portal

Direct Share Page
└── Partner Access / Sponsorship

Admin Portal
├── Overview
├── Events
├── Registrations
├── Matches
├── Accounting
│   ├── Record Transaction
│   ├── Transaction Ledger
│   └── Manage Categories
├── Reports
│   ├── Overview
│   ├── Finance
│   ├── Activity
│   └── Alerts
├── Users
├── Settings
└── User Manual
```

## 5. Registration Process – User Perspective

This section explains what a normal participant does on the public website.

### Step 1: Find an event

1. Open the website
2. Click `Events`
3. Browse the event cards
4. Click `View Event` on an open event
5. If you are not signed in yet, continue with Google login to unlock the full event page

If the event is not open yet, the button may show `Notify Later`.

### Step 2: Read event details

On the event details page, the user sees:
- Event name
- Sport type
- Venue
- Entry fee
- Event dates
- Registration opening date
- Registration deadline
- Team size and player limit
- Match schedule, if already published
- Current registration status such as `Open`, `Coming Soon`, `Closed`, or `Completed`

### Step 3: Fill out the registration form

If registration is open, the page shows a registration form.

Typical details needed:
- Participant name or team name
- Captain name for cricket
- Email
- Primary phone number
- Secondary phone number
- Address
- Player list

For team events, the player list is important. For individual events, some fields may be simpler.

### Step 4: Submit the registration

After the user fills the form:

- If the event is free:
  - the registration is saved immediately
- If the event is paid:
  - the system saves the registration draft
  - the user is sent to the payment page

### Step 5: See what happens next

After submitting:
- the user may be redirected to the payment process
- or the registration may be saved directly for a free event
- after login, the user can also check status from the `Dashboard`

### Step 6: Use the Dashboard after sign-in

The user dashboard now includes:
- `Registered Events` with registration and payment status
- `Upcoming Matches` for events where fixtures have been published
- `Refund / Payout Details` where the user can save UPI or bank information for future refunds or payouts

## 6. Coming Soon and Notify Later

Some events are shown as `Coming Soon`.

This means:
- the event is visible to the public
- registration is not open yet
- users can leave their name, email, and optional phone number

The button for such events is `Notify Later`.

When the user clicks it:
- the event page shows a simple interest form
- the user enters contact details
- the admin team can later see this list in the admin portal
- the system can also send email when registration opens

## 7. Payment Process – User Perspective

### When payment is required

If the event has an entry fee above zero:
- the user fills the registration form first
- then moves to the payment page

### What the user sees on the payment page

The payment page shows:
- Event name
- Team or registrant name
- Entry fee
- Available payment methods

Possible payment methods shown on screen:
- QR code
- UPI ID
- Bank transfer details

Only methods enabled by the admin are shown.

### What the user must do

1. Make payment using one of the shown methods
2. Enter a payment reference if available
3. Upload the payment screenshot or proof
4. Submit the proof for review

### What confirmation the user receives

After successful proof submission:
- the system shows a success message
- the record moves to admin review
- the user can later see the status in the user dashboard

### What happens if payment is pending or fails

The payment may show one of these states:

- `Pending`
  - payment was started, but not yet approved
- `Under Review`
  - proof was uploaded and is waiting for admin confirmation
- `Confirmed`
  - admin has approved the payment
- `Failed`
  - the payment could not be accepted or was rejected

If payment fails or stays pending:
- the user should check the payment proof
- the admin should review the case in `Registrations`
- the user may be contacted by email or phone if needed

## 8. Admin Actions After Registration and Payment

This is the normal internal workflow after a participant submits registration and payment.

### Step 1: Open Registrations

1. Login to the admin portal
2. Click `Registrations`
3. Select the date range
4. Click `Apply Filters`

### Step 2: Review new registrations

On the registration page, the admin can:
- see who registered
- see the event name
- see payment status
- open the full registration details

### Step 3: Verify payment status

Look at the payment badge:

- `Pending`
- `Under Review`
- `Confirmed`
- `Failed`

If proof was submitted manually, the admin should verify:
- payment amount
- reference number
- screenshot or proof
- matching event and participant details

### Step 4: Confirm the registration

Once payment is verified:
- update the payment / registration status to confirmed
- the participant then becomes part of the confirmed list for that event
- the event can later be used in schedule generation

### Step 5: Communicate with the participant if needed

If details are missing or unclear:
- use the email and phone details shown on the registration record
- contact the participant for correction

### Step 6: Export data if needed

The `Registrations` page includes export tools. Use them when:
- finance needs a record
- operations needs a team list
- management needs reporting

## 9. Accounting Section – Detailed Guide

The Accounting page is where money movement is entered and reviewed.

This page is now a focused transaction workspace. Business reporting has moved to the main `Reports` menu.

There are three main areas:

- `Record Transaction`
- `Transaction Ledger`
- `Manage Categories`

Important note:
- if Transaction OTP Approval is enabled in `Settings -> Security`, editing or deleting a transaction may require an email OTP

## 9.1 Record Transaction

This is the main place to enter new accounting records.

### Core transaction fields

These fields are the main part of the record:

**Transaction Type**
- Choose whether the entry is `Income` or `Expense`

**Ledger Scope**
- Choose whether the entry belongs to:
  - a specific event, or
  - the common company ledger

**Event**
- Select the related event if the transaction belongs to one event

**Category**
- Select the type of money movement, such as sponsorship, registration, vendor payment, venue cost, and so on

**Amount**
- Enter the value of the transaction

**Transaction Date**
- Enter the date when the money movement happened

**Payment Method**
- Choose how the transaction happened, such as cash, bank, online, or UPI

**Reference**
- Write the short subject of the transaction
- Example: sponsor name, team name, vendor name, or service description

### Supporting details

Below the main section, the user sees `Supporting Details`.

Fields here include:

**Supporting Document / Reference No.**
- Use for UTR number, voucher number, sponsor reference, receipt number, or document number

**Notes**
- Use for extra explanation
- Example: why the expense was made, what the payment covered, or anything finance should remember later

## 9.2 Invoice Generation

Invoice details are shown in a separate optional section.

This is important because:
- normal transactions do not always need an invoice
- sponsor collections or vendor bills often do need one

### When to use the invoice option

Turn on `Generate invoice for this transaction` when:
- a sponsor needs an invoice
- a vendor needs a formal bill
- an official printable document is required

Leave it off when:
- you only need a ledger entry
- no printed document is required

### Invoice fields

When the invoice option is turned on, extra fields appear:

- `Invoice Number`
- `Line Item Description`
- `Invoice Date`
- `Due Date`
- `Billing Contact`
- `Company / Organization`
- `Billing Email`
- `Billing Phone`
- `Billing Address`
- `Subtotal`
- `Tax Label`
- `Tax Rate`
- `Tax Amount`
- `Total`

### How to use it

1. Fill the main transaction details first
2. Turn on the invoice option
3. Enter billing details
4. Save the transaction
5. Use the print option when you need a printed invoice or bill

## 9.3 Record Transaction – Simplified Workflow

Use this simple rule:

```text
Step 1: Record the money movement
Step 2: Add notes or supporting reference
Step 3: Only turn on invoice details if a document is required
Step 4: Save the transaction
Step 5: Print the invoice later if needed
```

This keeps the process simple and reduces mistakes.

## 9.4 Transaction Ledger

This section is for viewing transactions that have already been recorded.

### What the user sees

- Filter panel
- Date range
- Event filter
- Scope filter
- Type filter
- Category filter
- Payment mode filter
- Source filter
- `Apply Filters`
- `Reset`
- `Export Transactions`

### How to use it

1. Open `Accounting`
2. Click `Transaction Ledger`
3. Set `From` and `To` dates
4. Add other filters if needed
5. Click `Apply Filters`

After that, the ledger loads.

### How to read the ledger

Each row shows:
- what the entry is
- whether it is income or expense
- date
- amount
- event or common ledger scope
- payment mode
- category
- notes or reference

### Export option

Use `Export Transactions` when:
- finance needs a file for bookkeeping
- management wants an offline record
- you want to share the filtered ledger with another team member

## 9.5 History Categories / Manage Categories

In the system, this area is shown as `Manage Categories`.

Purpose:
- maintain one clean list of accounting categories
- avoid duplicate category names
- keep reports organized

### What the admin can do

- add a new category
- edit an existing category
- delete a category if it is no longer needed

### Why categories matter

Categories help separate:
- sponsorship income
- registration income
- venue costs
- vendor payments
- administrative expenses
- other financial items

Good categories make reports easier to understand.

## 10. Reports – Finance and Operational Reporting

Reports are now in the main `Reports` menu.

### 10.1 Reports Overview

Use this when you want:
- event metrics
- participation summaries
- quick business insight

### 10.2 Finance

Use this when you want:
- income vs expense
- event-wise profit
- date-wise business summary
- payment status groups
- profit and loss statement

How to use:
1. Open `Reports`
2. Click `Finance`
3. Select the date range
4. Add event or scope filter if needed
5. Click `Load Finance`

### 10.3 Activity

Use this for:
- operational history
- who changed what
- when a major action was performed

How to use:
1. Open `Reports`
2. Click `Activity`
3. Select a date range
4. Click `Load History`

### 10.4 Alerts

Use this for:
- alerts
- unusual API activity
- contact and registration warnings
- payment-related alerts
- acknowledging alert items after review

The page includes:
- status filter
- severity filter
- category filter
- alert table
- acknowledgement action

## 11. Matches – Detailed Use

The `Matches` page is now a full match operations workspace.

Main work areas:
- `Match Configuration`
- `Fixture Management`
- `AI Fixture Lab`
- `Points System`
- `Team Registration`
- `Player Management`
- `Match Results Entry`
- `Standings and Rankings`
- `Knockout and Finals Setup`
- `Notifications and Alerts`
- `Calendar View`

Normal steps:
1. Choose an event
2. Save the tournament format, group setup, points rules, and knockout path
3. Load confirmed teams into the workspace
4. Create fixtures manually or generate them automatically
5. Optionally test draft schedules in `AI Fixture Lab`
6. Maintain team profiles, captain contacts, logos, and player details
7. Enter results and publish standings
8. Review the knockout path and final schedule in calendar view

Important notes:
- Use AI fixture suggestions as a draft and review them manually before approval
- This page works best after registration and payment confirmation are complete

## 12. Users and Roles

The `Users` page now handles both audience communication and internal access.

Tabs:

**Audience Users**
- search registered users, interested contacts, and past participants
- filter by event, payment status, location, tags, or engagement
- export the current list
- send reminder emails to the filtered audience

**Campaigns**
- build campaigns using a step-by-step wizard
- create reusable templates
- send test emails
- manage approval queues, scheduled campaigns, and opt-outs
- review campaign history and engagement analytics

**Admin Accounts**
- shows all admin users
- shows roles, effective page access, and last login

**Create Admin User**
- add name, username, email, password, and role

**Edit Admin User**
- update an existing admin account
- reset the selected admin password when needed

**Create Roles**
- define reusable managed role templates

**Modify Role Access**
- assign protected roles, managed roles, or manual page access
- edit role templates and activate or deactivate them

**Change Password**
- update the password for the current admin account

### Simple role idea

- `Admin` = full control
- `Operations` = event operations work
- `Accounting` = money and finance work
- `Custom Access Admin` = page-by-page manual access

If a user cannot see a menu item, check role access in this page.

## 13. Settings – Detailed Guide

The Settings page controls the full system behavior.

### Contact Forwarding
- choose which email addresses receive contact enquiries
- choose which email addresses receive completed registration notices
- choose which email addresses receive pending follow-up cases
- review incoming contact submissions and their forwarding status

### Email
- enter outgoing mail server details
- manage admin notification recipients
- use the test email option

### Invoice
- set logo, numbering, tax labels, payment terms, footer notes, and invoice style

### Appearance
- switch admin portal between light and dark mode

### Banners
- manage public home page banner cards and highlight content

### Gallery
- manage public home page content sections
- manage home and about page galleries
- upload images
- enable or disable galleries

### Website
- set public base URL used in links and emails

### Backups
- save backup email and schedule
- download database backup
- send a backup by email
- restore from backup
- use `Get Database Info` to check MongoDB size, collection count, host, and storage details before troubleshooting backup issues

### Security
- manage Transaction OTP Approval settings and related security controls
- decide whether transaction updates and deletes require email OTP verification

### Payments
- enable or disable manual payment confirmation
- set QR code, UPI, bank details, payment instructions, and proof inbox email

## 14. Visual Aids

Below are simple diagrams you can use while training staff.

### 14.1 Public registration flow

```text
Website Home / Events
        ↓
Open Event Preview
        ↓
Google Sign-In
        ↓
Full Event Details
        ↓
Fill Registration Form
        ↓
Is Entry Fee Zero?
   ├── Yes → Registration saved
   └── No  → Go to Payment Page
                  ↓
             Pay using QR / UPI / Bank
                  ↓
            Upload payment proof
                  ↓
          Status becomes Under Review
                  ↓
          Admin checks and confirms
```

### 14.2 Coming Soon flow

```text
User opens Coming Soon event
           ↓
Clicks "Notify Later"
           ↓
Enters name + email (+ optional phone)
           ↓
Record is stored in admin portal
           ↓
System or admin sends event email later
```

### 14.3 Admin registration review flow

```text
Admin Portal
   ↓
Registrations
   ↓
Apply date filter
   ↓
Open registration details
   ↓
Check payment proof and status
   ↓
Confirm / follow up / reject
   ↓
Export data if needed
```

### 14.4 Accounting workflow

```text
Accounting
├── Record Transaction
│   ├── Enter transaction details
│   ├── Add reference and notes
│   └── Optional: Generate invoice
├── Transaction Ledger
│   ├── Apply date filter
│   ├── Review entries
│   └── Export file
└── Manage Categories
    ├── Add category
    ├── Edit category
    └── Delete category
```

### 14.5 Suggested screenshot list

If you want to create a printed training booklet, add screenshots of these pages:

1. Public `Events` page with one open event and one Coming Soon event
2. Public event access prompt showing Google sign-in
3. Public event details page showing match schedule and the registration form
4. User `Dashboard`
5. Payment page showing QR / UPI / bank section
6. Admin `Overview`
7. Admin `Matches`
8. Admin `Users` with `Audience Users` or `Campaigns`
9. Admin `Reports`
10. Admin `Settings -> Backups` showing database info

When adding screenshots:
- circle the main button
- label the filter section
- label the save or export action
- keep each screenshot simple and uncluttered

## 15. Troubleshooting Tips

### A transaction is missing from the ledger

Check:
- did you click `Apply Filters`?
- is the date range correct?
- is the category or event filter hiding the record?
- was the transaction saved successfully?

### A participant says payment was made, but status is still pending

Check:
- did the user upload proof?
- is the proof clear?
- does the amount match the event fee?
- is the payment reference correct?

If everything is correct, confirm the payment from `Registrations`.

### A user cannot open full event details

Check:
- is the user signed in with Google?
- did they open the event from the `Events` page?
- is the event status `Open` or `Coming Soon`?
- if the event is closed or completed, the registration form will not appear

### An event is not visible on the website

Check:
- is the event hidden?
- is the event marked deleted?
- is the date range correct?
- is the event public-facing and registration enabled?

### A Coming Soon event is not taking registrations

That is expected. A Coming Soon event is meant only for:
- viewing event details
- collecting `Notify Later` interest

It will accept registrations only after the registration window opens.

### The user cannot see a menu item in the admin portal

Check:
- the assigned role
- the page permissions in `Users`

### A report is empty

Check:
- did you select the date range?
- did you click the load button?
- do transactions or activity records exist in that period?

### The invoice does not appear

Check:
- was `Generate invoice for this transaction` turned on?
- were billing details entered?
- are invoice settings configured in `Settings -> Invoice`?

### Backup or restore is not working

Check:
- correct backup file selected
- internet connection
- database connection status
- use `Settings -> Backups -> Get Database Info` to confirm the connected MongoDB details

### Campaign email is not sending

Check:
- is SMTP configured in `Settings -> Email`?
- did the test email work?
- is the campaign waiting in the approval queue?
- has the user unsubscribed from campaign email?

### Need support

Use the public contact section or contact the TriCore team through the configured support email:

- `contact@tricoreevents.online`

## 16. Everyday Best Practices

- Always check the date range before saying data is missing
- Use clear reference text when recording transactions
- Confirm payments before generating schedules
- Review AI fixture suggestions before approving them as the final schedule
- Keep categories clean and avoid duplicates
- Use exports regularly for offline record keeping
- Review alerts daily from `Overview` or `Reports -> Alerts`
- Use the `Notify Later` list for early marketing and follow-up
- Review audience opt-outs before launching campaigns
- Use the built-in `User Manual` page during onboarding and refresher training
- Check `Get Database Info` before assuming backup issues are caused by the file itself

## 17. Quick Start for New Staff

If you are training a new staff member, start in this order:

1. Show the public website and event flow
2. Show Google sign-in and the public event detail flow
3. Show the user `Dashboard`
4. Show `Overview`
5. Show `Events` and `Registrations`
6. Show `Matches`
7. Show `Accounting` and `Reports`
8. Show `Users`, `Settings`, and the built-in `User Manual`

This order is easier for beginners and reduces confusion.
