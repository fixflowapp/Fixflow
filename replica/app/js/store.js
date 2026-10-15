// FixFlow replica — local persistence layer + demo seed data.
const STORAGE_KEY = "fixflow.replica.v1";

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

function seed() {
  const now = new Date();
  const iso = (d) => d.toISOString();
  const daysAgo = (n) => iso(new Date(now.getTime() - n * 864e5));
  const daysAhead = (n) => iso(new Date(now.getTime() + n * 864e5));

  const techFirst = [
    ["Marcus", "Reyes", "Hardware & Diagnostics"],
    ["Priya", "Nair", "Software & Data Recovery"],
    ["Diego", "Alvarez", "Laptops & Tablets"],
    ["Hannah", "Okafor", "Appliances"],
    ["Tom", "Bennett", "Networking"],
    ["Sofia", "Costa", "Phones & Accessories"],
  ];
  const technicians = techFirst.map((t, i) => ({
    id: `TECH-${100 + i}`,
    name: `${t[0]} ${t[1]}`,
    firstName: t[0],
    lastName: t[1],
    email: `${t[0].toLowerCase()}.${t[1].toLowerCase()}@fixflow.io`,
    phone: `+1 (555) ${200 + i}-01${i}4`,
    specialty: t[2],
    status: ["available", "busy", "available", "off", "busy", "available"][i],
    hourlyRate: 65 + i * 5,
    maxJobsPerDay: 6,
    rating: +(4.3 + (i % 4) * 0.15).toFixed(2),
    jobsCompleted: 40 + i * 13,
    revenue: 8400 + i * 1750,
    startDate: daysAgo(500 + i * 30),
  }));

  const custNames = [
    ["Acme Solutions", "Jordan Fisher", "jordan@acmesolutions.com"],
    ["Northwind Traders", "Rebecca Wells", "rebecca.wells@northwind.co"],
    ["Bright Dental Group", "Dr. Alan Meyer", "alan@brightdental.com"],
    ["Cedar Ridge Hotel", "Monica Hall", "monica@cedarridgehotel.com"],
    ["Harbor Logistics", "Victor Nguyen", "victor@harborlog.com"],
    ["Sunrise Café", "Elena Rossi", "elena@sunrisecafe.com"],
    ["Vertex Legal", "Priya Shah", "priya@vertexlegal.com"],
    ["Greenway Schools", "Daniel Brooks", "daniel@greenway.edu"],
    ["Orbit Fitness", "Sasha Kim", "sasha@orbitfit.com"],
    ["Lakeside Clinic", "Dr. Grace Lin", "grace@lakesideclinic.com"],
    ["Riverside Bakery", "Omar Haddad", "omar@riversidebakery.com"],
    ["Summit Realty", "Tara Whitfield", "tara@summitrealty.com"],
  ];
  const cities = ["Portland, OR", "Austin, TX", "Denver, CO", "Seattle, WA", "Chicago, IL", "Miami, FL"];
  const customers = custNames.map((c, i) => ({
    id: `CUST-${100 + i}`,
    company: c[0],
    name: c[1],
    email: c[2],
    phone: `+1 (555) ${300 + i}-01${i}0`,
    address: `${120 + i * 7} ${["Oak", "Maple", "Pine", "Birch", "Cedar"][i % 5]} St`,
    city: cities[i % cities.length],
    preferredContact: ["email", "phone", "sms"][i % 3],
    createdAt: daysAgo(400 - i * 12),
    notes: i % 3 === 0 ? "Priority account — SLA 24h response." : "",
    tags: [["vip"], [], ["net-30"], ["vip", "net-30"], []][i % 5],
  }));

  const devices = ["Laptop", "Desktop", "Printer", "Server", "Phone", "Tablet", "Appliance", "Network Device"];
  const issues = [
    "Won't power on after surge",
    "Overheating and fan noise",
    "Cracked screen, touch unresponsive",
    "Slow performance, suspected malware",
    "Paper jam and roller wear",
    "Battery drains within an hour",
    "No network connectivity",
    "Water damage on keyboard",
    "Blue screen on boot",
    "Failing hard drive / data recovery",
    "Wi-Fi dropping intermittently",
    "Compressor not cooling",
  ];
  const statuses = ["open", "in_progress", "waiting_parts", "completed", "invoiced", "cancelled"];
  const priorities = ["low", "medium", "high", "urgent"];
  const serviceTypes = ["Repair", "Diagnostic", "Maintenance", "Installation", "Data Recovery"];

  const jobs = [];
  for (let i = 0; i < 46; i++) {
    const customer = customers[i % customers.length];
    const tech = technicians[i % technicians.length];
    const status = statuses[i % statuses.length];
    const estCost = 120 + (i * 37) % 780;
    const actual = status === "completed" || status === "invoiced" ? estCost + ((i % 5) - 2) * 25 : null;
    const partsCost = 30 + (i * 13) % 260;
    jobs.push({
      id: `JOB-${2000 + i}`,
      customerId: customer.id,
      title: `${devices[i % devices.length]} ${serviceTypes[i % serviceTypes.length]}`,
      deviceType: devices[i % devices.length],
      issue: issues[i % issues.length],
      status,
      priority: priorities[i % priorities.length],
      technicianId: tech.id,
      serviceType: serviceTypes[i % serviceTypes.length],
      estimatedCost: estCost,
      actualCost: actual,
      partsCost,
      laborHours: 1 + (i % 7) * 0.5,
      partsUsed: i % 3 === 0 ? [
        { name: "SSD 1TB NVMe", qty: 1, unitCost: 89 },
        { name: "Thermal Paste", qty: 1, unitCost: 12 },
      ] : [],
      scheduledDate: daysAhead((i % 14) - 6),
      createdAt: daysAgo(60 - (i % 55)),
      completedAt: status === "completed" || status === "invoiced" ? daysAgo(i % 20) : null,
      notes: i % 4 === 0 ? "Customer approved additional diagnostics." : "",
      warrantyUntil: daysAhead(120 + i * 5),
    });
  }

  const invoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled"];
  const invoices = [];
  for (let i = 0; i < 34; i++) {
    const job = jobs[i % jobs.length];
    const customer = customers.find((c) => c.id === job.customerId);
    const subtotal = job.estimatedCost || 200;
    const tax = +(subtotal * 0.08).toFixed(2);
    const status = invoiceStatuses[i % invoiceStatuses.length];
    invoices.push({
      id: `INV-${3000 + i}`,
      number: `INV-${3000 + i}`,
      jobId: job.id,
      customerId: customer.id,
      lineItems: [
        { description: `${job.title} — labor (${job.laborHours}h)`, qty: job.laborHours, unitPrice: 85, total: +(job.laborHours * 85).toFixed(2) },
        ...(job.partsUsed.length ? [{ description: "Parts & materials", qty: 1, unitPrice: job.partsCost, total: job.partsCost }] : []),
      ],
      subtotal,
      taxAmount: tax,
      total: +(subtotal + tax).toFixed(2),
      status,
      issuedAt: daysAgo(40 - (i % 38)),
      dueAt: daysAhead((i % 20) - 12),
      notes: "Payment due within 15 days. Thank you for your business.",
      sentAt: status !== "draft" ? daysAgo(35 - (i % 30)) : null,
    });
  }

  const payments = [];
  invoices.filter((inv) => inv.status === "paid").forEach((inv, i) => {
    payments.push({
      id: `PAY-${4000 + i}`,
      invoiceId: inv.id,
      customerId: inv.customerId,
      amount: inv.total,
      method: ["card", "bank_transfer", "cash", "check"][i % 4],
      reference: `REF-${80000 + i}`,
      recordedAt: daysAgo(i % 25),
      recordedBy: "Admin User",
    });
  });

  const partNames = [
    ["SSD 1TB NVMe", "STO-1TB-NVMe", 24, 6, 89],
    ["DDR5 16GB Module", "RAM-16-DDR5", 18, 5, 54],
    ["PSU 650W Gold", "PWR-650-GOLD", 4, 8, 79],
    ["Thermal Paste", "THM-PASTE-01", 40, 10, 12],
    ["Laptop Battery 60Wh", "BAT-60-WH", 3, 6, 49],
    ["USB-C Dock", "DOCK-USBC-7", 12, 4, 65],
    ["Fuser Assembly", "PRN-FUSER-4", 2, 3, 145],
    ["Wi-Fi 6 Card", "NET-WIFI6", 9, 4, 38],
    ["Screen 14\" FHD", "SCR-14-FHD", 5, 3, 119],
    ["Cooling Fan 92mm", "FAN-92-PWM", 21, 8, 17],
  ];
  const suppliers = [
    { id: "SUP-100", name: "TechParts Direct", contactName: "Karen Lee", email: "sales@techpartsdirect.com", phone: "+1 (555) 700-1122", address: "88 Industrial Way, Austin, TX", paymentTerms: "Net 30", rating: 4.7, category: "Components" },
    { id: "SUP-101", name: "CompSource Global", contactName: "Peter Kim", email: "orders@compsource.io", phone: "+1 (555) 700-3344", address: "12 Commerce Dr, Denver, CO", paymentTerms: "Net 45", rating: 4.3, category: "Bulk supply" },
    { id: "SUP-102", name: "PartsHub", contactName: "Rita Moreno", email: "hello@partshub.com", phone: "+1 (555) 700-5566", address: "500 Bay Rd, Seattle, WA", paymentTerms: "Net 15", rating: 4.8, category: "Specialty" },
    { id: "SUP-103", name: "Delta Components", contactName: "Owen Wright", email: "b2b@deltacomp.co", phone: "+1 (555) 700-7788", address: "9 Logistical Ave, Chicago, IL", paymentTerms: "Net 30", rating: 4.1, category: "Components" },
  ];
  const parts = partNames.map((p, i) => ({
    id: `PART-${500 + i}`,
    sku: p[1],
    name: p[0],
    quantity: p[2],
    reorderLevel: p[3],
    unitCost: p[4],
    supplierId: suppliers[i % suppliers.length].id,
    location: `Bin ${String.fromCharCode(65 + (i % 6))}${i + 1}`,
    lastRestocked: daysAgo(20 + i * 3),
  }));

  const contractPlans = ["Annual Maintenance", "Quarterly Service", "Monthly Support", "Extended Warranty"];
  const contracts = customers.slice(0, 9).map((c, i) => ({
    id: `CON-${600 + i}`,
    number: `MC-${600 + i}`,
    customerId: c.id,
    plan: contractPlans[i % contractPlans.length],
    coverage: "On-site diagnostics, preventive maintenance, priority scheduling and parts coverage.",
    billingCycle: ["monthly", "quarterly", "annual"][i % 3],
    amount: 240 + i * 60,
    startDate: daysAgo(200 - i * 10),
    endDate: daysAhead(60 + i * 20),
    status: i % 7 === 0 ? "expired" : "active",
    autoRenew: i % 2 === 0,
  }));

  const woStatuses = ["open", "in_progress", "done"];
  const workOrders = Array.from({ length: 14 }, (_, i) => ({
    id: `WO-${700 + i}`,
    title: `${["Bench transfer", "Warranty claim", "Supplier return", "Re-diagnosis"][i % 4]} — ${devices[i % devices.length]}`,
    description: "Internal work request generated by dispatch.",
    fromTechnicianId: technicians[i % technicians.length].id,
    toTechnicianId: technicians[(i + 1) % technicians.length].id,
    status: woStatuses[i % woStatuses.length],
    priority: priorities[i % priorities.length],
    relatedJobId: jobs[i % jobs.length].id,
    createdAt: daysAgo(i % 18),
  }));

  const templates = [
    { id: "TPL-1", title: "Laptop Screen Replacement", category: "Laptop", laborRate: 95, estimatedHours: 1.5, description: "Replace cracked or faulty display assembly.", defaultParts: [{ name: "Screen 14\" FHD", qty: 1 }] },
    { id: "TPL-2", title: "Data Recovery — HDD/SSD", category: "Data Recovery", laborRate: 120, estimatedHours: 3, description: "Recover data from failing or corrupted drive.", defaultParts: [{ name: "SSD 1TB NVMe", qty: 1 }] },
    { id: "TPL-3", title: "Virus & Malware Removal", category: "Software", laborRate: 80, estimatedHours: 1, description: "Full scan, removal and OS hardening.", defaultParts: [] },
    { id: "TPL-4", title: "Printer Maintenance Service", category: "Printer", laborRate: 70, estimatedHours: 1.5, description: "Clean rollers, replace fuser if worn.", defaultParts: [{ name: "Fuser Assembly", qty: 1 }] },
    { id: "TPL-5", title: "Network Setup & Config", category: "Network", laborRate: 90, estimatedHours: 2, description: "Router/switch configuration and Wi-Fi optimization.", defaultParts: [{ name: "Wi-Fi 6 Card", qty: 1 }] },
  ];

  const recurringJobs = [
    { id: "REC-1", title: "Quarterly server maintenance — Harbor Logistics", customerId: "CUST-104", frequency: "quarterly", nextRun: daysAhead(12), lastRun: daysAgo(78), active: true, templateId: "TPL-5" },
    { id: "REC-2", title: "Monthly printer service — Vertex Legal", customerId: "CUST-106", frequency: "monthly", nextRun: daysAhead(5), lastRun: daysAgo(25), active: true, templateId: "TPL-4" },
    { id: "REC-3", title: "Annual HVAC check — Cedar Ridge Hotel", customerId: "CUST-103", frequency: "annual", nextRun: daysAhead(40), lastRun: daysAgo(325), active: true, templateId: "TPL-4" },
    { id: "REC-4", title: "Bi-weekly POS review — Sunrise Café", customerId: "CUST-105", frequency: "weekly", nextRun: daysAhead(2), lastRun: daysAgo(12), active: false, templateId: "TPL-5" },
  ];

  const assets = Array.from({ length: 15 }, (_, i) => ({
    id: `AST-${800 + i}`,
    name: `${devices[i % devices.length]} — ${["Dell", "HP", "Lenovo", "Apple", "Asus"][i % 5]}`,
    serial: `SN-${90000 + i * 37}`,
    customerId: customers[i % customers.length].id,
    purchaseDate: daysAgo(400 + i * 20),
    warrantyUntil: daysAhead([-20, 15, 90, 300, 500][i % 5]),
    status: i % 5 === 0 ? "out_of_warranty" : "covered",
    healthScore: 55 + (i * 7) % 45,
    lastService: daysAgo(30 + i * 4),
  }));

  const conversations = customers.slice(0, 5).map((c, i) => ({
    id: `MSG-${900 + i}`,
    customerId: c.id,
    subject: ["Repair status update", "Invoice question", "Schedule change request", "Parts availability", "Follow-up on diagnosis"][i],
    messages: [
      { from: "customer", name: c.name, body: "Hi, any update on my repair? Thanks!", at: daysAgo(2) },
      { from: "tech", name: technicians[i % technicians.length].name, body: "We've completed the diagnosis and ordered the part — should be done in 2 days.", at: daysAgo(1) },
      { from: "customer", name: c.name, body: "Great, appreciate the quick turnaround.", at: daysAgo(0) },
    ],
  }));

  const auditLogs = Array.from({ length: 22 }, (_, i) => ({
    id: `LOG-${1000 + i}`,
    user: ["Admin User", "Marcus Reyes", "Priya Nair", "Sofia Costa"][i % 4],
    action: ["created", "updated", "deleted", "viewed", "exported"][i % 5],
    entityType: ["Job", "Customer", "Invoice", "Part", "Contract"][i % 5],
    entityId: [`JOB-${2000 + (i % 46)}`, `CUST-${100 + (i % 12)}`, `INV-${3000 + (i % 34)}`, `PART-${500 + (i % 10)}`, `CON-${600 + (i % 9)}`][i % 5],
    detail: "Field changes recorded in audit trail.",
    ip: `10.0.${i % 8}.${20 + i}`,
    at: daysAgo(i * 0.7),
  }));

  const gdprRequests = [
    { id: "GDPR-1", customerId: "CUST-100", type: "export", status: "done", requestedAt: daysAgo(20), completedAt: daysAgo(19) },
    { id: "GDPR-2", customerId: "CUST-102", type: "delete", status: "processing", requestedAt: daysAgo(3), completedAt: null },
    { id: "GDPR-3", customerId: "CUST-105", type: "export", status: "pending", requestedAt: daysAgo(1), completedAt: null },
  ];

  const notifications = [
    { id: "N1", type: "warning", title: "Low stock: PSU 650W Gold", body: "Quantity 4 is below reorder level 8.", at: daysAgo(0), read: false },
    { id: "N2", type: "danger", title: "Invoice INV-3003 overdue", body: "14 days past due — Bright Dental Group.", at: daysAgo(0), read: false },
    { id: "N3", type: "info", title: "New service request", body: "Submitted via Customer Portal.", at: daysAgo(1), read: true },
    { id: "N4", type: "success", title: "Job JOB-2004 completed", body: "Marked complete by Marcus Reyes.", at: daysAgo(1), read: true },
  ];

  return {
    technicians,
    customers,
    jobs,
    invoices,
    payments,
    suppliers,
    parts,
    contracts,
    workOrders,
    templates,
    recurringJobs,
    assets,
    conversations,
    auditLogs,
    gdprRequests,
    notifications,
    serviceRequests: [],
    settings: {
      companyName: "FixFlow Repairs",
      email: "support@fixflow.io",
      phone: "+1 (555) 010-2030",
      address: "1 Riverside Plaza, Portland, OR 97201",
      taxRate: 8,
      invoiceTerms: "Payment due within 15 days.",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      language: "en",
      theme: "light",
      density: "comfortable",
      invoicePrefix: "INV-",
      jobPrefix: "JOB-",
      notifications: { email: true, inApp: true, sms: false, lowStock: true, overdue: true },
      roles: [
        { name: "Admin User", email: "admin@fixflow.io", role: "admin" },
        { name: "Dana Manager", email: "dana@fixflow.io", role: "manager" },
        { name: "Marcus Reyes", email: "marcus@fixflow.io", role: "technician" },
      ],
    },
    session: { user: "Admin User", email: "admin@fixflow.io", role: "admin", initials: "AU" },
  };
}

let state = null;
const listeners = new Set();

// ---- Supabase sync state -------------------------------------------------
let sb = null;               // lazily-imported ./supabase.js module (only if configured)
let sbOn = false;            // true once connected & first pull/push done
const lastPushed = {};       // collection -> JSON snapshot last written to Supabase
let syncTimer = null;

async function getSupabase() {
  const cfg = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
  if (!cfg.url || !cfg.anonKey) return null;         // not configured → stay local-only
  try { return await import("./supabase.js"); } catch (e) { console.warn("[fixflow] supabase import failed:", e); return null; }
}

export const COLLECTIONS = ["jobs", "customers", "technicians", "invoices", "payments", "parts", "suppliers", "contracts", "workOrders", "templates", "recurringJobs", "assets", "conversations", "auditLogs", "gdprRequests", "notifications", "serviceRequests"];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const s = seed();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}

// Pull from Supabase on boot. Falls back to local data if unavailable.
export async function initStore() {
  if (!state) state = load();
  sb = await getSupabase();
  if (!sb) { snapshotAll(); return { source: "local" }; }
  const res = await sb.pullAll();
  if (!res.ok) { snapshotAll(); return { source: "local", error: res.error }; }

  sbOn = true;
  const remoteHasData = (res.count || 0) > 0;
  if (remoteHasData) {
    const base = seed();
    const merged = { ...base };
    for (const c of COLLECTIONS) if (res.collections[c] && res.collections[c].length) merged[c] = res.collections[c];
    if (res.settings && Object.keys(res.settings).length) merged.settings = res.settings;
    merged.session = state.session;                 // keep current session
    state = merged;
  } else {
    await sb.seedIfEmpty(state);                    // first run → seed the cloud
  }
  persistCache();
  snapshotAll();
  return { source: "supabase", seeded: !remoteHasData };
}

function snapshotAll() {
  for (const c of COLLECTIONS) lastPushed[c] = JSON.stringify(state[c] || []);
  lastPushed.settings = JSON.stringify(state.settings || {});
  lastPushed.session = JSON.stringify(state.session || {});
}

function scheduleSync() {
  if (!sbOn || !sb) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 400);
}

export function syncNow() {
  if (!sbOn || !sb) return;
  for (const c of COLLECTIONS) {
    const json = JSON.stringify(state[c] || []);
    if (lastPushed[c] !== json) { lastPushed[c] = json; sb.pushCollection(c, state[c] || []); }
  }
  const sj = JSON.stringify(state.settings || {});
  if (lastPushed.settings !== sj) { lastPushed.settings = sj; sb.pushSettings(state.settings || {}); }
}

export const store = new Proxy({}, {
  get(_t, prop) {
    if (!state) state = load();
    if (prop === "reset") return async () => { state = seed(); persist(); if (sbOn) await sb.seedIfEmpty(state); return state; };
    if (prop === "subscribe") return (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
    if (prop === "source") return sbOn ? "supabase" : "local";
    return state[prop];
  },
  set(_t, prop, value) {
    if (!state) state = load();
    state[prop] = value;
    persist();
    listeners.forEach((fn) => fn());
    return true;
  },
});

function persistCache() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function persist() {
  persistCache();
  scheduleSync();
}

export function mutate(fn) {
  if (!state) state = load();
  fn(state);
  persist();
  listeners.forEach((l) => l());
}

export const id = uid;

export function logAudit(action, entityType, entityId, detail) {
  mutate((s) => {
    s.auditLogs.unshift({
      id: uid("LOG"),
      user: s.session?.user || "Admin User",
      action, entityType, entityId,
      detail: detail || "",
      ip: "127.0.0.1",
      at: new Date().toISOString(),
    });
  });
}
