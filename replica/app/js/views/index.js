import { dashboard, home } from "./dashboard.js";
import { jobs, jobDetails, newJob, jobEdit, jobTemplates, recurringJobs, workOrders, jobCosting } from "./jobs.js";
import { customers, customerDetails, newCustomer, customerEdit, assetMonitoring, customerPortal, requestService, messages } from "./customers.js";
import { invoices, invoiceDetails, newInvoice, payments, invoiceAutomation, invoiceFollowUps } from "./invoices.js";
import { schedule, technicians, technicianDashboard, technicianMobile, technicianView, technicianPerformance } from "./schedule.js";
import { partsInventory, suppliers, maintenanceContracts } from "./inventory.js";
import { reports } from "./reports.js";
import { settings, dataImport, auditLogs, gdprAdmin } from "./admin.js";
import { emptyState } from "../components.js";

const VIEWS = {
  dashboard, home,
  jobs, "job-details": jobDetails, "new-job": newJob, "job-edit": jobEdit, "job-templates": jobTemplates, "recurring-jobs": recurringJobs, "work-orders": workOrders, "job-costing": jobCosting,
  customers, "customer-details": customerDetails, "new-customer": newCustomer, "customer-edit": customerEdit, "asset-monitoring": assetMonitoring, "customer-portal": customerPortal, "request-service": requestService, messages,
  invoices, "invoice-details": invoiceDetails, "new-invoice": newInvoice, payments, "invoice-automation": invoiceAutomation, "invoice-follow-ups": invoiceFollowUps,
  schedule, technicians, "technician-dashboard": technicianDashboard, "technician-mobile": technicianMobile, "technician-view": technicianView, "technician-performance": technicianPerformance,
  "parts-inventory": partsInventory, suppliers, "maintenance-contracts": maintenanceContracts,
  reports, settings, "data-import": dataImport, "audit-logs": auditLogs, "gdpr-admin": gdprAdmin,
};

const NOT_FOUND = {
  title: "Not Found",
  crumb: () => ["Not Found"],
  render: () => emptyState("Page not found", "The screen you're looking for doesn't exist in this replica.", `<button class="btn btn-primary btn-sm" data-nav="dashboard">Back to dashboard</button>`, "search"),
};

export function getView(id) {
  return VIEWS[id] || NOT_FOUND;
}

export { VIEWS };
