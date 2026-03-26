# TriCore Events User Manual

This manual explains the TriCore Events system in simple language. It is written for people who may not be comfortable with computers or web applications. Use it as a day-to-day guide for operating the website and the admin portal.

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
- `Events`
- `Contact`
- `Admin Portal`

### What each public page does

**Home**
- Shows the brand, banners, highlights, upcoming events, process steps, and key information
- This is the main first page of the website

**About**
- Explains the TriCore story, experience, partners, and gallery content

**Events**
- Shows all visible events
- Upcoming events are shown first
- Events may show statuses like `Registration Open`, `Coming Soon`, or `Registration Closed`

**Contact**
- Shows email, website, partner names, and contact numbers
- Contains the `Reach Out` form where users can send an enquiry

**Admin Portal**
- Opens the login screen for internal staff

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

If a menu item is missing, it usually means the user role does not have permission for that page.

### 3.1 Overview

Purpose:
- Gives a quick summary of the whole system

What the user sees:
- Summary cards such as total events, registrations, revenue, and alerts
- Revenue trend chart
- Participation mix
- Quick navigation tiles
- Payment status summary
- A planning calendar showing events, holidays, and sports fixtures
- Recent payments
- Recent alerts
- Upcoming event window

Use this page when:
- You want to quickly understand what needs attention today
- You want to see upcoming events and open alerts in one place

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
- Manage match schedules for confirmed teams

What the user sees:
- Event selector
- Team selectors
- Match creation form
- Knockout bracket generation controls
- List of existing matches for the selected event

Use this page when:
- Teams are confirmed and you need to build the event schedule

### 3.5 Accounting

Purpose:
- Record money movement and maintain transaction data

What the user sees:
- Three internal tabs:
  - `Record Transaction`
  - `Transaction Ledger`
  - `Manage Categories`
- Accounting summary cards
- Ledger filters and export options

Important note:
- Financial reports are in the main `Reports` menu
- `Accounting` is mainly for entering and reviewing transaction records

### 3.6 Reports

Purpose:
- View financial, operational, and security reports

What the user sees:
- Tabs such as:
  - `Overview`
  - `Finance`
  - `Activity`
  - `Security`
- Date filters before report data is loaded
- Searchable, paginated report tables
- Export buttons

Use this page when:
- You need business summaries
- You want Profit & Loss information
- You want operational history
- You want to review alerts

### 3.7 Users

Purpose:
- Create admin users and manage access rights

What the user sees:
- Tabs:
  - `Admin Accounts`
  - `Create Admin User`
  - `Create Roles`
  - `Modify Role Access`
  - `Change Password`

Use this page when:
- A new staff member needs access
- A role needs to be updated
- A password needs to be changed

### 3.8 Settings

Purpose:
- Control system-wide configuration

What the user sees:
- Tabs such as:
  - `Contact Forwarding`
  - `Email (SMTP)`
  - `Invoice`
  - `Appearance`
  - `Home Page`
  - `Gallery`
  - `Website`
  - `Backups`
  - `Security`
  - `Payments`

Use this page when:
- You want to change email routing
- You want to update invoice settings
- You want to control banners, galleries, or public website values
- You want to manage backups or payment settings

## 4. Simple Menu Map

```text
Public Website
├── Home
├── About
├── Events
│   └── Event Details
│       ├── Register Now
│       └── Notify Later
├── Contact
└── Admin Portal

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
│   └── Security
├── Users
└── Settings
```

## 5. Registration Process – User Perspective

This section explains what a normal participant does on the public website.

### Step 1: Find an event

1. Open the website
2. Click `Events`
3. Browse the event cards
4. Click `View Event` on an open event

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

There are three main areas:

- `Record Transaction`
- `Transaction Ledger`
- `Manage Categories`

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

### 10.4 Security

Use this for:
- alerts
- unusual API activity
- contact and registration warnings
- payment-related alerts

The page includes:
- status filter
- severity filter
- category filter
- alert table

## 11. Matches – Detailed Use

The `Matches` page is used after teams are confirmed.

Main use cases:
- create one match manually
- generate a knockout bracket for an event

Normal steps:
1. Choose an event
2. Load confirmed teams
3. Create fixtures manually, or
4. Generate bracket automatically

This page should be used only after registration and payment confirmation work is complete.

## 12. Users and Roles

The `Users` page helps control internal access.

Tabs:

**Admin Accounts**
- shows all admin users
- shows roles and last login

**Create Admin User**
- add name, username, email, password, and role

**Create Roles**
- define reusable role templates

**Modify Role Access**
- change which pages a role or user can open

**Change Password**
- update the password for the current admin account

### Simple role idea

- `Admin` = full control
- `Operations` = event operations work
- `Accounting` = money and finance work

If a user cannot see a menu item, check role access in this page.

## 13. Settings – Detailed Guide

The Settings page controls the full system behavior.

### Contact Forwarding
- choose which email addresses receive contact enquiries
- choose which email addresses receive completed registration notices
- choose which email addresses receive pending follow-up cases

### Email (SMTP)
- enter outgoing mail server details
- use test email option

### Invoice
- set logo, numbering, tax labels, payment terms, footer notes, and invoice style

### Appearance
- switch admin portal between light and dark mode

### Home Page
- manage home page content and highlights

### Gallery
- manage home and about page galleries
- upload images
- enable or disable galleries

### Website
- set public base URL used in links and emails

### Backups
- download database backup
- send backup
- restore from backup

### Security
- manage transaction OTP settings and related security controls

### Payments
- set QR code, UPI, bank details, and manual payment behavior

## 14. Visual Aids

Below are simple diagrams you can use while training staff.

### 14.1 Public registration flow

```text
Website Home / Events
        ↓
Open Event Details
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
2. Public event details page showing the registration form
3. Payment page showing QR / UPI / bank section
4. Admin `Overview`
5. Admin `Events`
6. Admin `Registrations`
7. Admin `Accounting`
8. Admin `Reports`
9. Admin `Users`
10. Admin `Settings`

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

### Need support

Use the public contact section or contact the TriCore team through the configured support email:

- `contact@tricoreevents.online`

## 16. Everyday Best Practices

- Always check the date range before saying data is missing
- Use clear reference text when recording transactions
- Confirm payments before generating schedules
- Keep categories clean and avoid duplicates
- Use exports regularly for offline record keeping
- Review alerts daily from `Overview` or `Reports -> Security`
- Use the `Notify Later` list for early marketing and follow-up

## 17. Quick Start for New Staff

If you are training a new staff member, start in this order:

1. Show the public website and event flow
2. Show `Overview`
3. Show `Events`
4. Show `Registrations`
5. Show `Accounting`
6. Show `Reports`
7. Show `Users` and `Settings` only for senior staff

This order is easier for beginners and reduces confusion.

