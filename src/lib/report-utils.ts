import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_WIDTH = 210;
const MARGIN = 20;
const LINE_HEIGHT = 7;
const SECTION_GAP = 12;
const PAGE_BREAK_Y = 240;
const RECEIPT_SECTION_GAP = 6;

function formatReceiptShortDate(ts: number | { toMillis?: () => number } | undefined): string {
  if (!ts) return "—";
  const ms = typeof ts === "number" ? ts : ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function truncateReceiptLabel(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/**
 * Plain "PHP 1,234.56" for PDFs — avoids ₱ (missing in Helvetica), which often renders as "±" in readers.
 */
export function formatPHP(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "PHP 0.00";
  const num = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `PHP ${num}`;
}

/** Nested assignment receipt (Firestore), same shape as assignment.receipt */
export interface ReportReceiptPayload {
  confirmationNumber?: string;
  lineItems?: Array<{
    name?: string;
    baseRate?: number;
    hours?: number;
    adjustedRate?: number;
    amount?: number;
  }>;
  subtotal?: number;
  commission?: number;
  total?: number;
  dynamicPricing?: { tier?: string; percent?: number; components?: unknown };
  volunteerTier?: string;
  rateAdjustment?: number;
}

function servicesToReceiptLabel(services: string | string[] | undefined): string {
  return Array.isArray(services) ? services.join(", ") : (services || "");
}

function receiptHasDisplayableData(receipt: ReportReceiptPayload | null | undefined): boolean {
  if (!receipt) return false;
  if (Array.isArray(receipt.lineItems) && receipt.lineItems.length > 0) return true;
  if (typeof receipt.total === "number" && Number.isFinite(receipt.total)) return true;
  return false;
}

export type ReceiptSectionRow = {
  assignmentId?: string;
  serviceDateTS?: unknown;
  services: string | string[];
  elderName?: string;
  volunteerName?: string;
  volunteerEmail?: string;
  receipt?: ReportReceiptPayload | null;
};

/** Appends compact “Receipts” after completed history; handles pagination. */
function addReceiptsSection(doc: jsPDF, items: ReceiptSectionRow[], startY: number): number {
  if (items.length === 0) return startY;
  let y = startY;
  if (y > PAGE_BREAK_Y) {
    doc.addPage();
    y = 20;
  }
  y = addSectionTitle(doc, "Receipts", y) + 1;
  const anyReceipt = items.some((i) => receiptHasDisplayableData(i.receipt));
  if (!anyReceipt) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("No itemized receipts in this period.", MARGIN, y, { maxWidth: PAGE_WIDTH - 2 * MARGIN });
    return y + LINE_HEIGHT * 2;
  }

  for (const item of items) {
    if (!receiptHasDisplayableData(item.receipt)) continue;
    const r = item.receipt as ReportReceiptPayload;
    if (y > PAGE_BREAK_Y) {
      doc.addPage();
      y = 20;
    }

    const dateStr = formatReceiptShortDate(item.serviceDateTS as number | { toMillis?: () => number });
    const svc = truncateReceiptLabel(servicesToReceiptLabel(item.services), 42);
    const conf =
      r.confirmationNumber ||
      (item.assignmentId ? `#${item.assignmentId.slice(0, 8).toUpperCase()}` : "—");
    const volLabel = truncateReceiptLabel(item.volunteerName || item.volunteerEmail || "", 22);
    const elderLabel = truncateReceiptLabel(item.elderName || "", 18);
    const metaParts = [dateStr, conf, svc];
    if (elderLabel) metaParts.push(`E:${elderLabel}`);
    if (volLabel) metaParts.push(`V:${volLabel}`);
    const headerLine = metaParts.join(" · ");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(headerLine, MARGIN, y, { maxWidth: PAGE_WIDTH - 2 * MARGIN });
    y += LINE_HEIGHT + 1;

    const lineRows = (r.lineItems || []).map((li) => [
      truncateReceiptLabel(li.name || "—", 28),
      Number(li.hours ?? 0).toFixed(1),
      formatPHP(li.adjustedRate ?? li.baseRate ?? 0),
      formatPHP(li.amount ?? 0),
    ]);
    const bodyRows: (string | number)[][] =
      lineRows.length > 0
        ? lineRows
        : [["—", "—", formatPHP(0), formatPHP(r.total ?? 0)]];
    const footerRows: (string | number)[][] = [
      ["", "", "Subtotal", formatPHP(r.subtotal ?? 0)],
      ["", "", "5% fee", formatPHP(r.commission ?? 0)],
      ["", "", "Total", formatPHP(r.total ?? 0)],
    ];
    const allBody = bodyRows.concat(footerRows);
    const firstFooterIdx = bodyRows.length;

    autoTable(doc, {
      startY: y,
      head: [["Service", "Hr", "Rate", "Amt"]],
      body: allBody,
      theme: "plain",
      headStyles: { fillColor: [230, 230, 230], fontStyle: "bold", fontSize: 7 },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: PAGE_WIDTH - 2 * MARGIN,
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 58 },
        1: { halign: "right", cellWidth: 18 },
        2: { halign: "right", cellWidth: 38 },
        3: { halign: "right", cellWidth: 38 },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const idx = data.row.index;
        if (idx >= firstFooterIdx) {
          data.cell.styles.fillColor = [248, 248, 248];
          if (data.column.index === 2) data.cell.styles.fontStyle = "bold";
          if (data.column.index === 3) data.cell.styles.fontStyle = idx === allBody.length - 1 ? "bold" : "normal";
          if (data.column.index <= 1) data.cell.text = "";
        }
      },
    });
    y = ((doc as any).lastAutoTable?.finalY as number) + 2;

    const dp = r.dynamicPricing;
    const dpPct = dp && typeof dp.percent === "number" ? Math.round(dp.percent * 100) : null;
    const tierBits: string[] = [];
    if (dp && (dp.tier != null || dpPct != null)) {
      tierBits.push(dp.tier ? String(dp.tier) : "");
      if (dpPct != null) tierBits.push(`${dpPct}%`);
    }
    if (r.volunteerTier) tierBits.push(r.volunteerTier);
    if (tierBits.length > 0) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Adj: ${tierBits.filter(Boolean).join(", ")}`, MARGIN, y, { maxWidth: PAGE_WIDTH - 2 * MARGIN });
      y += LINE_HEIGHT - 1;
    }
    y += RECEIPT_SECTION_GAP;
  }
  return y;
}

export function formatTimestamp(ts: number | { toMillis?: () => number } | undefined): string {
  if (!ts) return "";
  const ms = typeof ts === "number" ? ts : ts?.toMillis?.();
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}

/** Milliseconds from Firestore Timestamp, number (ms), or 0 if unknown. */
export function toTimestampMs(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === "number" && Number.isFinite(ts)) return ts;
  if (typeof ts === "object" && ts !== null && typeof (ts as { toMillis?: () => number }).toMillis === "function") {
    const ms = (ts as { toMillis: () => number }).toMillis();
    return typeof ms === "number" && Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/** Whether a record’s timestamp falls in [startMs, endMs] inclusive. */
export function isInDateRange(ts: unknown, startMs: number, endMs: number): boolean {
  const ms = toTimestampMs(ts);
  if (!ms) return false;
  return ms >= startMs && ms <= endMs;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN, y);
  return y + LINE_HEIGHT;
}

function addKeyValueTable(
  doc: jsPDF,
  rows: [string, string | number][],
  startY: number
): number {
  const body = rows.map(([k, v]) => [k, String(v)]);
  autoTable(doc, {
    startY,
    head: [["Metric", "Value"]],
    body,
    theme: "plain",
    headStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: PAGE_WIDTH - 2 * MARGIN,
  });
  return (doc as any).lastAutoTable?.finalY ?? startY + 20;
}

function addDataTable(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  startY: number
): number {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.length > 0 ? rows : [headers.map(() => "—")],
    theme: "striped",
    headStyles: { fillColor: [66, 66, 66], fontStyle: "bold" },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: PAGE_WIDTH - 2 * MARGIN,
    styles: { fontSize: 8 },
  });
  return (doc as any).lastAutoTable?.finalY ?? startY + 20;
}

export interface VolunteerReportData {
  /** Shown under "Generated" when set, e.g. "Jan 1, 2025 – Jan 31, 2025" */
  dateRangeLabel?: string;
  volunteerName: string;
  totalCompletedServices: number;
  totalCompletedHours: number;
  peopleHelped: number;
  ratingAvg: number | null;
  ratingCount: number;
  levelLabel: string;
  hoursThisWeek: number;
  upcomingThisWeek: number;
  completedAssignments: Array<{
    assignmentId?: string;
    serviceDateTS?: number | { toMillis?: () => number };
    elderName?: string;
    services: string | string[];
    startTimeText?: string;
    endTimeText?: string;
    durationMinutes: number;
    receipt?: ReportReceiptPayload | null;
  }>;
  upcomingAssignments: Array<{
    serviceDateTS?: number | { toMillis?: () => number };
    elderName?: string;
    services: string | string[];
    startTimeText?: string;
    endTimeText?: string;
    status?: string;
  }>;
}

export function generateVolunteerReport(data: VolunteerReportData): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ElderEase Volunteer Report", MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Volunteer: ${data.volunteerName}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  if (data.dateRangeLabel) {
    y += LINE_HEIGHT;
    doc.text(`Report period: ${data.dateRangeLabel}`, MARGIN, y);
  }
  y += SECTION_GAP;

  y = addSectionTitle(doc, "Personal Statistics", y);
  const period = Boolean(data.dateRangeLabel);
  const statsRows: [string, string | number][] = [
    [period ? "Completed services (in period)" : "Total completed services", data.totalCompletedServices],
    [period ? "Hours completed (in period)" : "Total hours", data.totalCompletedHours.toFixed(1)],
    [period ? "People helped (in period)" : "People helped", data.peopleHelped],
    ["Average rating", data.ratingAvg != null ? data.ratingAvg.toFixed(1) : "—"],
    ["Rating count", data.ratingCount],
    ["Level", data.levelLabel],
    ...(period
      ? [["Upcoming visits (in period)", data.upcomingThisWeek] as [string, string | number]]
      : [
          ["Hours this week", data.hoursThisWeek.toFixed(1)] as [string, string | number],
          ["Upcoming this week", data.upcomingThisWeek] as [string, string | number],
        ]),
  ];
  y = addKeyValueTable(doc, statsRows, y) + SECTION_GAP;

  if (data.completedAssignments.length > 0) {
    y = addSectionTitle(doc, "Service History (Completed)", y);
    const servicesHeaders = ["Date", "Elder Name", "Services", "Time Slot", "Duration"];
    const servicesRows = data.completedAssignments.map((a) => {
      const dur = a.durationMinutes > 0 ? `${Math.floor(a.durationMinutes / 60)}h ${a.durationMinutes % 60}m` : "";
      return [
        formatTimestamp(a.serviceDateTS),
        a.elderName || "",
        Array.isArray(a.services) ? a.services.join(", ") : a.services || "",
        `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
        dur,
      ];
    });
    y = addDataTable(doc, servicesHeaders, servicesRows, y) + SECTION_GAP;
  }

  if (data.upcomingAssignments.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Upcoming Schedule", y);
    const scheduleHeaders = ["Date", "Elder Name", "Services", "Time Slot", "Status"];
    const scheduleRows = data.upcomingAssignments
      .sort((a, b) => (a.serviceDateTS ?? 0) - (b.serviceDateTS ?? 0))
      .map((a) => [
        formatTimestamp(a.serviceDateTS),
        a.elderName || "",
        Array.isArray(a.services) ? a.services.join(", ") : a.services || "",
        `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
        a.status || "Assigned",
      ]);
    y = addDataTable(doc, scheduleHeaders, scheduleRows, y) + SECTION_GAP;
  }

  const volunteerReceiptRows: ReceiptSectionRow[] = data.completedAssignments.map((a) => ({
    assignmentId: a.assignmentId,
    serviceDateTS: a.serviceDateTS,
    services: a.services,
    elderName: a.elderName,
    volunteerName: data.volunteerName,
    receipt: a.receipt,
  }));
  addReceiptsSection(doc, volunteerReceiptRows, y);

  const filename = `ElderEase-Volunteer-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface ElderReportData {
  dateRangeLabel?: string;
  guardianName: string;
  pendingRequestsCount: number;
  upcomingCount: number;
  completedCount: number;
  pendingRequests: Array<{
    services?: string[] | string;
    serviceDateDisplay?: string;
    serviceDateTS?: unknown;
    startTimeText?: string;
    endTimeText?: string;
    status?: string;
    createdAt?: unknown;
  }>;
  upcomingAssignments: Array<{
    serviceDateTS?: unknown;
    services?: string[] | string;
    volunteerName?: string;
    volunteerEmail?: string;
    startTimeText?: string;
    endTimeText?: string;
    address?: string;
  }>;
  completedAssignments: Array<{
    assignmentId?: string;
    serviceDateTS?: unknown;
    services?: string[] | string;
    elderName?: string;
    volunteerName?: string;
    volunteerEmail?: string;
    startTimeText?: string;
    endTimeText?: string;
    receipt?: ReportReceiptPayload | null;
  }>;
}

export function generateElderReport(data: ElderReportData): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ElderEase Guardian Report", MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Guardian: ${data.guardianName}`, MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  if (data.dateRangeLabel) {
    y += LINE_HEIGHT;
    doc.text(`Report period: ${data.dateRangeLabel}`, MARGIN, y);
  }
  y += SECTION_GAP;

  y = addSectionTitle(doc, "Summary", y);
  const periodElder = Boolean(data.dateRangeLabel);
  const summaryRows: [string, string | number][] = [
    [periodElder ? "Pending requests (in period)" : "Pending requests", data.pendingRequestsCount],
    [periodElder ? "Upcoming visits (in period)" : "Upcoming visits", data.upcomingCount],
    [periodElder ? "Completed services (in period)" : "Completed services", data.completedCount],
  ];
  y = addKeyValueTable(doc, summaryRows, y) + SECTION_GAP;

  if (data.pendingRequests.length > 0) {
    y = addSectionTitle(doc, "Pending Requests", y);
    const headers = ["Services", "Date", "Time", "Status"];
    const rows = data.pendingRequests.map((r) => [
      Array.isArray(r.services) ? r.services.join(", ") : (r.services || ""),
      r.serviceDateDisplay || formatTimestamp(r.serviceDateTS as number | { toMillis?: () => number }),
      `${r.startTimeText || ""} - ${r.endTimeText || ""}`,
      r.status || "pending",
    ]);
    y = addDataTable(doc, headers, rows, y) + SECTION_GAP;
  }

  if (data.upcomingAssignments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Upcoming Schedule", y);
    const headers = ["Date", "Services", "Volunteer", "Time", "Address"];
    const rows = data.upcomingAssignments.map((a) => [
      formatTimestamp(a.serviceDateTS as number | { toMillis?: () => number }),
      Array.isArray(a.services) ? a.services.join(", ") : (a.services || ""),
      a.volunteerName || a.volunteerEmail || "—",
      `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
      a.address || "—",
    ]);
    y = addDataTable(doc, headers, rows, y) + SECTION_GAP;
  }

  if (data.completedAssignments.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Completed Service History", y);
    const headers = ["Date", "Services", "Volunteer", "Time"];
    const rows = data.completedAssignments.map((a) => [
      formatTimestamp(a.serviceDateTS as number | { toMillis?: () => number }),
      Array.isArray(a.services) ? a.services.join(", ") : (a.services || ""),
      a.volunteerName || a.volunteerEmail || "—",
      `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
    ]);
    y = addDataTable(doc, headers, rows, y) + SECTION_GAP;
  }

  const elderReceiptRows: ReceiptSectionRow[] = data.completedAssignments.map((a) => ({
    assignmentId: a.assignmentId,
    serviceDateTS: a.serviceDateTS,
    services: a.services ?? "",
    elderName: a.elderName,
    volunteerName: a.volunteerName,
    volunteerEmail: a.volunteerEmail,
    receipt: a.receipt,
  }));
  addReceiptsSection(doc, elderReceiptRows, y);

  const filename = `ElderEase-Guardian-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface AdminReportData {
  dateRangeLabel?: string;
  requestsInPeriodCount?: number;
  completedInPeriodCount?: number;
  totalRequests: number;
  pendingRequests: number;
  activeVolunteers: number;
  completedThisWeek: number;
  cancellationRate: number;
  capacityForecast: { projectedCapacity: number; forecastedDemand: number; status: string; gap: number };
  forecastMethod: string;
  serviceDemandForecast: Array<{ name: string; current: number; forecast: number }>;
  cancellationReasons: Array<{ name: string; value: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; services: number | null; forecast: number | null }>;
  topServices: Array<{ name: string; requests: number; percentage: number }>;
  allVolunteers: Array<{
    name: string;
    email: string;
    rating: number | null;
    totalServices: number;
    specialty: string;
  }>;
  requests: Array<{
    createdAt?: unknown;
    elderName?: string;
    familyName?: string;
    services?: string[];
    service?: string;
    serviceDateTS?: unknown;
    status?: string;
  }>;
  completedAssignments: Array<{
    assignmentId?: string;
    serviceDateTS?: unknown;
    volunteerEmail?: string;
    volunteerName?: string;
    elderName?: string;
    services?: string[];
    servicesStr?: string;
    startTimeText?: string;
    endTimeText?: string;
    receipt?: ReportReceiptPayload | null;
  }>;
}

export function generateAdminReport(data: AdminReportData): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ElderEase Admin Report", MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  if (data.dateRangeLabel) {
    y += LINE_HEIGHT;
    doc.text(`Report period: ${data.dateRangeLabel}`, MARGIN, y);
  }
  y += SECTION_GAP;

  // 1. Dashboard Summary
  y = addSectionTitle(doc, "Dashboard Summary", y);
  const totalCompleted = data.completedAssignments.length;
  const completionRate = data.totalRequests > 0
    ? Math.round((totalCompleted / data.totalRequests) * 1000) / 10
    : 0;
  const summaryRows: [string, string | number][] = [
    ["Total requests (all time)", data.totalRequests],
    ["Pending requests", data.pendingRequests],
    ["Completed services (all time)", totalCompleted],
    ["Completed this week", data.completedThisWeek],
    ...(data.dateRangeLabel && data.requestsInPeriodCount != null && data.completedInPeriodCount != null
      ? [
          [`Service requests in period (see log below)`, data.requestsInPeriodCount],
          [`Completed services in period (see history below)`, data.completedInPeriodCount],
        ]
      : []),
    ["Completion rate (%)", `${completionRate}%`],
    ["Active volunteers", data.activeVolunteers],
    ["Cancellation rate (%)", `${data.cancellationRate}%`],
  ];
  y = addKeyValueTable(doc, summaryRows, y) + SECTION_GAP;

  // 2. Capacity & Demand Outlook
  y = addSectionTitle(doc, "Capacity & Demand Outlook", y);
  const gap = data.capacityForecast.gap;
  const outlookRows: [string, string | number][] = [
    ["Projected volunteer completions (next month)", data.capacityForecast.projectedCapacity],
    ["Forecasted incoming requests (next month)", data.capacityForecast.forecastedDemand],
    ["Gap (demand - capacity)", gap > 0 ? `+${gap} (shortage)` : gap < 0 ? `${gap} (surplus)` : "0 (balanced)"],
    ["Status", data.capacityForecast.status.charAt(0).toUpperCase() + data.capacityForecast.status.slice(1)],
    ["Forecast method used", data.forecastMethod.toUpperCase()],
  ];
  y = addKeyValueTable(doc, outlookRows, y) + SECTION_GAP;

  // 3. Service Demand Forecast — enriched with change
  if (data.serviceDemandForecast.length > 0) {
    y = addSectionTitle(doc, "Service Demand Forecast", y);
    const demandHeaders = ["Service", "Current Month", "Forecasted Next Month", "Change"];
    const demandRows = data.serviceDemandForecast.map((s) => {
      const diff = s.forecast - s.current;
      const changeStr = diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : "—";
      return [s.name, String(s.current), String(s.forecast), changeStr];
    });
    y = addDataTable(doc, demandHeaders, demandRows, y) + SECTION_GAP;
  }

  // 4. Most Requested Services
  if (data.topServices.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Most Requested Services", y);
    const svcHeaders = ["Service", "Requests", "Share (%)"];
    const svcRows = data.topServices.map((s) => [s.name, String(s.requests), `${s.percentage}%`]);
    y = addDataTable(doc, svcHeaders, svcRows, y) + SECTION_GAP;
  }

  // 5. Cancellation Breakdown
  if (data.cancellationReasons.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Cancellation Breakdown", y);
    const cancelHeaders = ["Reason", "Count", "Share (%)"];
    const cancelRows = data.cancellationReasons.map((r) => [r.name, String(r.value), `${r.percentage}%`]);
    y = addDataTable(doc, cancelHeaders, cancelRows, y) + SECTION_GAP;
  }

  // 6. Monthly Service Trend
  if (data.monthlyTrend.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, "Monthly Service Trend", y);
    const trendHeaders = ["Month", "Completed", "Forecast"];
    const trendRows = data.monthlyTrend.map((m) => [
      m.month,
      m.services != null ? String(m.services) : "",
      m.forecast != null ? String(m.forecast) : "",
    ]);
    y = addDataTable(doc, trendHeaders, trendRows, y) + SECTION_GAP;
  }

  // 7. Volunteers with services
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, `Volunteers with services (${data.allVolunteers.length} total)`, y);
  const volHeaders = ["Name", "Email", "Rating", "Total Services", "Specialty"];
  const volRows = data.allVolunteers.map((v) => [
    v.name,
    v.email,
    v.rating != null ? v.rating.toFixed(1) : "—",
    String(v.totalServices),
    v.specialty,
  ]);
  y = addDataTable(doc, volHeaders, volRows, y) + SECTION_GAP;

  // 8. Service Request Log
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(
    doc,
    data.dateRangeLabel ? `Service Request Log (${data.dateRangeLabel})` : "Service Request Log",
    y
  );
  const reqHeaders = ["Created", "Elder Name", "Services", "Service Date", "Status"];
  const reqRows = data.requests.map((r) => [
    formatTimestamp(r.createdAt as number | { toMillis?: () => number }),
    (r.elderName || r.familyName || "") as string,
    Array.isArray(r.services) ? r.services.join(", ") : (r.service || ""),
    formatTimestamp(r.serviceDateTS as number | { toMillis?: () => number }),
    r.status || "pending",
  ]);
  y = addDataTable(doc, reqHeaders, reqRows, y) + SECTION_GAP;

  // 9. Completed Service History
  if (y > 240) { doc.addPage(); y = 20; }
  y = addSectionTitle(
    doc,
    data.dateRangeLabel ? `Completed Service History (${data.dateRangeLabel})` : "Completed Service History",
    y
  );
  const compHeaders = ["Date", "Volunteer", "Elder", "Services", "Time Slot"];
  const compRows = data.completedAssignments.map((a) => [
    formatTimestamp(a.serviceDateTS as number | { toMillis?: () => number }),
    a.volunteerEmail || "",
    a.elderName || "",
    Array.isArray(a.services) ? a.services.join(", ") : (a.servicesStr || ""),
    `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
  ]);
  y = addDataTable(doc, compHeaders, compRows, y) + SECTION_GAP;

  const adminReceiptRows: ReceiptSectionRow[] = data.completedAssignments.map((a) => ({
    assignmentId: a.assignmentId,
    serviceDateTS: a.serviceDateTS,
    services: Array.isArray(a.services) ? a.services : (a.servicesStr || ""),
    elderName: a.elderName,
    volunteerName: a.volunteerName,
    volunteerEmail: a.volunteerEmail,
    receipt: a.receipt,
  }));
  addReceiptsSection(doc, adminReceiptRows, y);

  const filename = `ElderEase-Admin-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
