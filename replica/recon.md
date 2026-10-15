# Recon map: FixFlow (web app, base44 platform)

Scope: Full repair management system — jobs, customers, invoices, technicians, scheduling, parts, suppliers, reporting.
For: The user's own business (repair shop / field service operations).
Date: 2026-10-13

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Public app (SEO pages) | https://fix-flow-321f28e4.base44.app/ | Full nav tree of 37 screens; content rendered client-side |
| 2 | App store / social listing | TBD | No public app store presence found from metadata |
| 3 | Marketing site / pitch | https://fix-flow-321f28e4.base44.app/ | SEO meta describes it as "streamlined repair management system" |

## Core loop

The thing users pay for: **create a repair job, assign a technician, track progress through statuses, then invoice the customer** — all from a single dashboard.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Dashboard | `/` or `/dashboard` | Main overview with KPIs, recent activity, quick actions | Stat cards, recent jobs table, quick links, chart widgets | empty (no data), filled, loading |
| S02 | Home | `/home` | Landing/welcome screen | Welcome message, shortcuts, announcements | same as dashboard |
| S03 | Jobs list | `/jobs` | Browse all repair jobs with filters | Search bar, status filters, table (job #, customer, status, assignee, date), pagination, "New Job" button | empty, filled, filtered, error |
| S04 | New job form | `/new-job` or `/newjob` | Create a new repair job | Customer picker, device type, issue description, priority select, technician dropdown, parts checklist, cost fields, save/cancel | blank, validation errors, long content |
| S05 | Job details | `/job-details/:id` or `/jobdetails` | View and manage a single job | Status stepper/timeline, customer info card, device details, issue log, parts used, costs, notes, assignee, status history, action buttons (edit, move to invoice) | filled, long description, empty parts list |
| S06 | Edit job | `/job-edit/:id` or `/jobedit` | Modify an existing job's fields | Same form as new job with pre-filled data | edited, validation errors |
| S07 | Job templates | `/job-templates` or `/jobtemplates` | Reusable job configurations for common repairs | Template list card, template name, description, default parts, "Create template" form | empty (no templates), filled |
| S08 | Recurring jobs | `/recurring-jobs` or `/recurringjobs` | Schedule recurring repair/maintenance jobs | Recurrence pattern (daily/weekly/monthly), trigger conditions, list of active recurring jobs | empty, filled |
| S09 | Asset monitoring | `/asset-monitoring` or `/assetmonitoring` | Track equipment/assets under warranty/repair | Asset list, warranty status table, alerts for expiring warranties, search/filter | empty, filled |
| S10 | Customers list | `/customers` | Browse all customers | Search by name/email/phone, filter by recent jobs, table with customer info | empty, filled |
| S11 | New customer | `/new-customer` or `/newcustomer` | Add a new customer to the system | Name fields, email, phone, address, preferred contact method, save/cancel | blank, validation errors |
| S12 | Customer details | `/customer-details/:id` or `/customerdetails` | View customer profile and history | Name/contact info card, repair history table (linked jobs), total spend, notes section | filled, no repairs history |
| S13 | Edit customer | `/customer-edit/:id` or `/customeredit` | Modify customer's contact info | Same fields as new customer form | edited |
| S14 | Customer portal | `/customer-portal` or `/customer-portal` | Self-service page for customers to check job status | Login area, active jobs list with status, upload section (photos), notes from technician | empty (not logged in), authenticated view |
| S15 | Invoices list | `/invoices` | Browse all invoices | Search, filter by status/amount/date, table (invoice #, customer, amount, status, due date) | empty, filled, filtered |
| S16 | Invoice details | `/invoice-details/:id` or `/invoicedetails` | View a single invoice | Line items (labor, parts), subtotal/tax/total, payment status, PDF preview/download, send to customer button | filled, unpaid, paid |
| S17 | New invoice | `/new-invoice` or `/newinvoice` | Create an invoice from a job | Job picker, line item editor (description, qty, price), tax calc, notes/terms, generate button | blank with auto-figured totals from job |
| S18 | Invoice automation | `/invoice-automation` or `/invoice-automation` | Auto-invoice rules and status-based triggers | Rule list (if status=X then create invoice), manual override toggle, history log | empty, filled |
| S19 | Invoice follow-ups | `/invoice-follow-ups` or `/invoicefollowups` | Track overdue or pending invoices | Overdue table with days outstanding, send reminder button, notes on communication | empty, overdue items |
| S20 | Payments | `/payments` | Record and track payments received | Payment list (amount, method, date, linked invoice), record payment form, filter by status | empty, filled |
| S21 | Schedule | `/schedule` | Calendar view of technician availability and job assignments | Month/week/day calendar, drag-drop assignment, color-coded by technician or status | empty, populated, mobile narrow |
| S22 | Technician dashboard | `/technician-dashboard` or `/techniciandashboard` | Technician's personal work queue | Today's jobs list, status update buttons (started/in progress/completed), time logs, notes | empty, filled |
| S23 | Technician mobile view | `/technician-mobile` or `/technician-mobile` | Mobile-optimized interface for field technicians | Simplified job cards, tap-to-update status, GPS location capture, photo upload | small viewport, landscape |
| S24 | Technician view (detailed) | `/technician-view/:id` or `/technician-view` | Detailed task view for a specific job | Step-by-step repair checklist, parts needed, customer notes, time entry | filled |
| S25 | Technician performance | `/technician-performance` or `/technicianperformance` | Metrics and KPIs for technicians | Jobs completed, avg time per job, revenue per tech, ratings (if applicable) charts | empty, filled |
| S26 | Technicians list | `/technicians` | Manage technician roster | Name, specialties, status (available/busy/off), current load, "Add technician" | empty, filled |
| S27 | Job costing | `/job-costing` or `/jobcosting` | Profitability analysis per job | Labor cost, parts cost, labor revenue, margin %, breakdown table | filled, no data |
| S28 | Parts inventory | `/parts-inventory` or `/partsinventory` | Track spare parts and supplies | Part name/SKU, quantity on hand, reorder level, supplier, cost, "Add part" form | empty, low stock highlight |
| S29 | Suppliers list | `/suppliers` | Manage supplier relationships | Supplier name, contact info, catalog of parts they supply, payment terms, ratings | empty, filled |
| S30 | Work orders | `/work-orders` or `/workorders` | Internal work request/transfer system | Work order status (open/in-progress/done), assignee, priority, linked jobs | empty, filled |
| S31 | Maintenance contracts | `/maintenance-contracts` or `/maintenancecontracts` | Recurring service agreements with customers | Contract terms, start/end date, covered services, billing cycle, active/expired list | empty, active, expired |
| S32 | Reports | `/reports` | Business analytics and financial reports | Revenue charts, job volume trends, top services, average turnaround time, export options | empty (no data), with data |
| S33 | Messages | `/messages` | Internal messaging between team members | Conversation list, send/receive messages, @mentions, search | empty (no conversations), filled |
| S34 | Request service | `/request-service` or `/requestservice` | Customer-facing new service request form | Name, phone/email, device description, issue type, preferred date, submit | blank, validation errors |
| S35 | Settings | `/settings` | Business configuration and preferences | Company name/logo, branding, tax rate, default invoice terms, notification prefs, user roles | filled, with custom values |
| S36 | Data import | `/data-import` or `/dataimport` | Bulk import customers/jobs/invoices from CSV/Excel | Upload area, field mapping UI, preview of parsed rows, import button | empty (no file), validation errors, success confirmation |
| S37 | GDPR admin | `/gdpr-admin` or `/gdpradmin` | Data privacy compliance tools | Export customer data, delete/anonymize requests, audit trail for data access | empty, with requests |
| S38 | Audit logs | `/audit-logs` or `/audit-logs` | Track all system changes over time | Timestamp, user action, entity changed, old value, new value — searchable/filterable | empty, filled |

## Flows

```
F01 Create a repair job (happy path)
    S04 New job form -> S05 Job details
    happy path clicks: 4
    edge: customer doesn't exist yet -> S11 -> back to S04, validation errors on submit, parts not in stock

F02 Complete a repair and invoice (core revenue loop)
    S03 Jobs list -> S05 Job details (status update to Completed) -> S17 New invoice -> S16 Invoice details -> S20 Payments
    happy path clicks: 8
    edge: job has no customer, line items don't add up, invoice already exists

F03 Assign a technician via schedule
    S21 Schedule view -> drag-and-drop to assign tech -> S22 Technician dashboard sees new job
    happy path clicks: 3
    edge: technician already at capacity, time conflict with existing job

F04 Customer checks job status self-service
    S14 Customer portal login (or magic link) -> S14 Active jobs view
    happy path clicks: 2
    edge: first-time customer no account, forgotten email address

F05 Track overdue invoices
    S19 Invoice follow-ups -> filter overdue -> send reminder from row
    happy path clicks: 3
    edge: invoice paid after being marked overdue, customer has moved

F06 Run a business report
    S32 Reports -> select metric (revenue/turnaround/margin) -> view chart and export
    happy path clicks: 4
    edge: no data for selected period, time range too large

F07 Manage parts inventory reorder
    S28 Parts inventory -> filter low stock -> update quantity or create PO to supplier
    happy path clicks: 4
    edge: same part from multiple suppliers, discontinued item
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Status badge | Open, In Progress, Waiting Parts, Completed, Invoiced, Paid, Cancelled | default, highlighted (active) | S03, S05, S15, S22, S38 |
| Stat card | Numeric display with label, delta indicator | loading skeleton, value, empty state | S01 |
| Data table | Sortable columns, row click to detail, pagination | default, hover, selected | S03, S10, S15, S26, S28, S38 |
| Form field | Text input, select, textarea, date picker, file upload | default, focus, error, disabled | S04, S11, S17, S36 |
| Button | Primary (filled), secondary (outlined), ghost (text), danger (red) | default, hover, active, focus, loading/disabled | all screens |
| Timeline / stepper | Vertical progress tracker showing repair stages | completed, current, upcoming, skipped | S05 |
| Calendar grid | Month/week/day view with event dots or blocks | default, hovered day, selected range | S21 |
| Search bar | Global or scoped search with debounce and keyboard shortcut | focused, results shown, no results | S03, S10, S15, S28, S38 |
| Navigation sidebar | Collapsible list of links with icons, active indicator | collapsed (icon only), expanded, hover item | all auth screens |
| Modal / drawer | Inline overlay for create/edit without page change | open, close button, form inside | S04, S11, S17, S28 |
| Toast notification | Success/error/info message auto-dismisses | success (green), error (red), info (blue) | all screens |
| Tab bar | Horizontal tabs for related views within a detail page | default, active tab indicator, hover | S05, S12, S16 |

## Inferred data model

```
User  id, name, email, password_hash, role (admin, manager, technician), created_at
      evidence: S26 technicians list with roles, S35 settings for user management
      confidence: high

Customer  id, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip,
          created_at, updated_at, preferred_contact_method
      evidence: S10 customers table columns, S11/S13 form fields, S12 detail card
      confidence: high

Job  id, customer_id, title, description (device type, issue), status (Open, In Progress, Waiting Parts,
     Completed, Invoiced, Cancelled), assigned_technician_id, priority (low/medium/high/urgent),
     estimated_cost, actual_cost, labor_hours, parts_used (json array),
     created_at, updated_at, scheduled_date, completed_at
      evidence: S04/S05/S06 form fields and detail view, S07 status labels, F01-F02 flows
      confidence: high

JobTemplate  id, title, description, default_parts (json), labor_rate, category
      evidence: S07 screen name and purpose from nav label
      confidence: medium (guessed from screen name)

Invoice  id, job_id, customer_id, line_items (json: description, qty, unit_price, total),
         subtotal, tax_amount, total, status (draft, sent, paid, overdue, cancelled),
         issued_at, due_at, payment_link, notes
      evidence: S15/S16/S17 screen purposes, F02 flow, S19/S20 follow-on screens
      confidence: high

Payment  id, invoice_id, amount, method (cash, card, check, bank_transfer),
         recorded_at, reference_number, recorded_by_user_id
      evidence: S20 payments list with linked invoices
      confidence: high

Technician  id, user_id (FK to User), specialties (json), status (available, busy, off),
             max_jobs_per_day, rating (float)
      evidence: S25 performance table rows, S26 roster with specialty/status columns
      confidence: medium

Supplier  id, name, contact_name, email, phone, address, payment_terms, notes
      evidence: S29 supplier list purpose from nav label
      confidence: high

PartInventory  id, supplier_id (FK), sku, name, quantity_on_hand, reorder_level,
               unit_cost, last_restocked_at
      evidence: S28 parts inventory with stock levels and supplier linkage
      confidence: high

MaintenanceContract  id, customer_id, start_date, end_date, coverage_description,
                     billing_cycle (monthly/quarterly/annual), amount, status (active, expired, cancelled)
      evidence: S31 screen purpose from nav label
      confidence: medium

WorkOrder  id, from_technician_id, to_teignician_id, title, description, status,
           priority, created_at, related_job_id (nullable)
      evidence: S30 work order list from nav label
      confidence: low (guessed from name — less common feature)

Message  id, sender_id, receiver_id (or team), subject, body, created_at, read_at
      evidence: S33 messages screen from nav label
      confidence: medium

AuditLog  id, user_id, action (created/updated/deleted/viewed/exported), entity_type,
          entity_id, old_value (json), new_value (json), ip_address, created_at
      evidence: S38 audit logs with these standard columns
      confidence: high

GDPRRequest  id, customer_id, request_type (export, delete), status (pending, processing, done),
              requested_by_user_id, created_at, completed_at
      evidence: S37 GDPR admin from nav label
      confidence: medium

RecurringJob  id, template_id or job_id, recurrence_pattern (daily/weekly/monthly/custom),
              next_trigger_date, last_triggered, active
      evidence: S08 recurring jobs screen
      confidence: low
```

Relationships: Customer 1-n Jobs, Job 1-1 Invoice, Invoice 1-n Payments, User 1-n Messages (sender+receiver), Technician 1-n Jobs (assigned), Supplier n-m PartsInventory, Customer n-n MaintenanceContracts, Tech 1-n WorkOrders (from+to).

## Feature matrix

See `features.csv`. Must: 8, should: 6, could: 6, skip: 2.

## Out of scope (cannot or should not be cloned)

- The Base44 platform infrastructure and deployment tooling — that's the hosting/runtime, not the product
- Any third-party integrations (email delivery, payment processing) unless explicitly wired in via replica-backend
- The actual customer data stored by FixFlow — we rebuild the capability to store our own data, not migrate theirs

## Size

Screens 38, flows 7, entities ~11. Hard parts: real-time technician mobile sync and status updates (S22/S23), scheduling with calendar conflicts (S21), multi-currency/tax invoice automation (S18).
Size: L (a quarter) — 38 screens is a substantial app. Recommend phasing: core jobs-invoicing flow first (S03-S06, S15-S17, S20, S21), then customer management (S10-S13), then extensions (inventory, suppliers, reports, tech performance).
