# FixFlow clone — architecture and build order

## Phase 1: App shell + routing
S40 App shell (layout with sidebar nav, header with user menu)
S41 Auth screens (login, register)
S42 Settings screen
S43 Seed data (admin user, sample customer, tech, jobs, invoices)

## Phase 2: Core job lifecycle (must ship for MVP)
S03 Jobs list — table with search, status filter, pagination
S04 New job form — wizard or single-page form
S05 Job details — stepper, customer info, timeline, action buttons
S06 Edit job — reuse S04 form with pre-fill
S10 Customers list — table with search
S11 New customer — form
S12 Customer details — profile + repair history
S17 New invoice — create from a job
S15 Invoices list — table with status filter

## Phase 3: Payments and dispatch
S20 Payments — record payments, list view
S26 Technicians — roster management
S22 Technician dashboard — personal work queue
S21 Schedule — calendar assignment view

## Phase 4: Business operations
S28 Parts inventory — stock tracking with reorder levels
S29 Suppliers — supplier directory
S31 Maintenance contracts — recurring service agreements
S07 Job templates — reusable job configurations
S37 Audit logs — activity history table

## Phase 5: Financial reporting and automation
S27 Job costing — profitability per job
S18 Invoice automation — auto-invoice rules
S19 Invoice follow-ups — overdue tracker
S32 Reports — analytics dashboard with charts
S09 Asset monitoring — warranty tracking

## Phase 6: Extensions
S08 Recurring jobs — schedule templates
S34 Request service — customer-facing intake form
S33 Messages — team chat
S14 Customer portal — self-service status page
S25 Technician performance — kpi charts
S23 Technician mobile view — compact responsive UI
S24 Technician detailed view — step-by-step repair checklist
S30 Work orders — internal transfers
S36 Data import — CSV/Excel upload
S38 GDPR admin — data export/delete workflow

## Screen build order (for replica-build)

1. S40 App shell → routing for all 38 screens
2. S41 Login + registration
3. S42 Settings
4. Phase 2 screens in order: S03, S04, S05, S06, S10, S11, S12, S17, S15
5. Phase 3: S20, S26, S22, S21
6. Phase 4: S28, S29, S31, S07, S37
7. Phase 5: S27, S18, S19, S32, S09
8. Phase 6: S08, S34, S33, S14, S25, S23, S24, S30, S36, S38

## Layout conventions

- **Sidebar nav** (collapsible): logo on top, link groups by area (Dashboard, Jobs, Customers, Invoices, Schedule, Technicians, Reports, Admin)
- **Header**: breadcrumb, global search bar, notification bell, user avatar dropdown
- **Main content area**: card-based layout, max-width 1440px container
- **Tables**: stripe rows, sortable headers, hover state, row click = navigate to detail
- **Forms**: two-column on wide screens, single column below 768px
- **Status badges**: color-coded pills (green=completed/paid, blue=in progress/open, yellow=waiting, red=cancelled/overdue)
