# FixFlow clone — build log

| Screen | Date | Status | Missing | Difficulty notes |
| --- | --- | --- | --- | --- |
| recon.md | 2026-10-13 | done | — | 38 screens, 7 flows, ~11 entities |
| features.csv | 2026-10-13 | done | — | 8 must, 6 should, 6 could, skip=platform infra |
| architecture.md | 2026-10-13 | done | — | 4 phases, screen-by-screen build order |
| S40 App shell | 2026-10-15 | done | — | Sidebar (collapsible + mobile), header, breadcrumb, global search, notifications, user menu, light/dark theme |
| S41 Auth | 2026-10-15 | done | — | Split login screen, demo sign-in, session gate |
| S42 Settings | 2026-10-15 | done | — | 6 tabs: General, Invoicing, Notifications, Users & Roles, Appearance, Advanced |
| S43 Seed data | 2026-10-15 | done | — | localStorage-backed store seeded with 12 customers, 6 techs, 46 jobs, 34 invoices, payments, parts, suppliers, contracts, WOs, templates, assets, logs |
| S01 Dashboard | 2026-10-15 | done | — | KPI cards, revenue line chart, status donut, recent jobs, low-stock + schedule + overdue panels |
| S02 Home | 2026-10-15 | done | — | Greeting, quick actions, today's agenda, recent activity |
| S03 Jobs list | 2026-10-15 | done | — | Search, status/priority/tech filters, CSV export, row → detail |
| S04 New job | 2026-10-15 | done | — | Full form, validation, creates record + audit log |
| S05 Job details | 2026-10-15 | done | — | Status stepper, timeline, parts, costs, inline status/tech update, invoice gen |
| S06 Edit job | 2026-10-15 | done | — | Reuses job form with pre-fill |
| S07 Job templates | 2026-10-15 | done | — | Template cards, create modal, delete |
| S08 Recurring jobs | 2026-10-15 | done | — | Frequency table, pause/resume, create modal |
| S09 Asset monitoring | 2026-10-15 | done | — | Warranty status, health bars, add asset |
| S10 Customers list | 2026-10-15 | done | — | Search, city/contact filters, spend rollup, export |
| S11 New customer | 2026-10-15 | done | — | Validated form |
| S12 Customer details | 2026-10-15 | done | — | Profile, repair history, invoices, notes |
| S13 Edit customer | 2026-10-15 | done | — | Pre-filled form |
| S14 Customer portal | 2026-10-15 | done | — | Self-service active jobs, history, photo upload |
| S15 Invoices list | 2026-10-15 | done | — | Status filter, search, KPIs, export |
| S16 Invoice details | 2026-10-15 | done | — | Line items, totals, payment status, record payment, PDF (print), send |
| S17 New invoice | 2026-10-15 | done | — | Job picker auto-fills line items, live tax/total, generate |
| S18 Invoice automation | 2026-10-15 | done | — | Rule list with toggles, ready-to-invoice queue |
| S19 Invoice follow-ups | 2026-10-15 | done | — | Overdue table, days-outstanding badges, send reminder |
| S20 Payments | 2026-10-15 | done | — | Volume chart, payment table, method breakdown, export |
| S21 Schedule | 2026-10-15 | done | — | Month calendar, colour-coded events, today's assignments, .ICS export |
| S22 Technician dashboard | 2026-10-15 | done | — | Personal queue, start/complete actions, time log |
| S23 Technician mobile | 2026-10-15 | done | — | Phone mockup, tap-to-update, GPS + photo capture |
| S24 Technician view | 2026-10-15 | done | — | Step checklist, parts, time entry, mark complete |
| S25 Technician performance | 2026-10-15 | done | — | Revenue bar chart, completed donut, leaderboard, export |
| S26 Technicians list | 2026-10-15 | done | — | Roster cards, capacity bars, add/edit, workload modal |
| S27 Job costing | 2026-10-15 | done | — | Margin table, cost breakdown, KPI cards |
| S28 Parts inventory | 2026-10-15 | done | — | Stock table, low-stock alerts, adjust stock, auto-PO, export |
| S29 Suppliers | 2026-10-15 | done | — | Directory cards, supplied-parts modal, add/edit |
| S30 Work orders | 2026-10-15 | done | — | Internal transfer table, create modal |
| S31 Maintenance contracts | 2026-10-15 | done | — | Contract table, MRR KPIs, create modal |
| S32 Reports | 2026-10-15 | done | — | Revenue/volume charts, device donut, scorecard, top customers, export |
| S33 Messages | 2026-10-15 | done | — | Conversation list, chat thread, send message |
| S34 Request service | 2026-10-15 | done | — | Intake form, "how it works" panel, submit |
| S35 Settings | 2026-10-15 | done | — | See S42 |
| S36 Data import | 2026-10-15 | done | — | Upload/drag-drop, CSV parse + preview, template download |
| S37 GDPR admin | 2026-10-15 | done | — | Request table, JSON export, deletion processing |
| S38 Audit logs | 2026-10-15 | done | — | Filterable log table, KPIs, export |

Notes: static SPA, no build step — open `replica/app/index.html` or serve `replica/app/` with any static server. All data is localStorage-backed (`fixflow.replica.v1`); use the avatar menu → "Reset demo data" to restore the seed. AI-assistant features referenced in the live bundle are mocked as static panels/toasts.
