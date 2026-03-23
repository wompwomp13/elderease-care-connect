import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_WIDTH = 210;
const MARGIN = 20;
const LINE_HEIGHT = 7;
const SECTION_GAP = 12;

export function formatTimestamp(ts: number | { toMillis?: () => number } | undefined): string {
  if (!ts) return "";
  const ms = typeof ts === "number" ? ts : ts?.toMillis?.();
  if (!ms) return "";
  return new Date(ms).toLocaleString();
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
    serviceDateTS?: number | { toMillis?: () => number };
    elderName?: string;
    services: string | string[];
    startTimeText?: string;
    endTimeText?: string;
    durationMinutes: number;
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
  y += SECTION_GAP;

  y = addSectionTitle(doc, "Personal Statistics", y);
  const statsRows: [string, string | number][] = [
    ["Total completed services", data.totalCompletedServices],
    ["Total hours", data.totalCompletedHours.toFixed(1)],
    ["People helped", data.peopleHelped],
    ["Average rating", data.ratingAvg != null ? data.ratingAvg.toFixed(1) : "—"],
    ["Rating count", data.ratingCount],
    ["Level", data.levelLabel],
    ["Hours this week", data.hoursThisWeek.toFixed(1)],
    ["Upcoming this week", data.upcomingThisWeek],
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
    addDataTable(doc, scheduleHeaders, scheduleRows, y);
  }

  const filename = `ElderEase-Volunteer-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface ElderReportData {
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
    serviceDateTS?: unknown;
    services?: string[] | string;
    volunteerName?: string;
    volunteerEmail?: string;
    startTimeText?: string;
    endTimeText?: string;
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
  y += SECTION_GAP;

  y = addSectionTitle(doc, "Summary", y);
  const summaryRows: [string, string | number][] = [
    ["Pending requests", data.pendingRequestsCount],
    ["Upcoming visits", data.upcomingCount],
    ["Completed services", data.completedCount],
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
    addDataTable(doc, headers, rows, y);
  }

  const filename = `ElderEase-Guardian-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface AdminReportData {
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
    serviceDateTS?: unknown;
    volunteerEmail?: string;
    elderName?: string;
    services?: string[];
    servicesStr?: string;
    startTimeText?: string;
    endTimeText?: string;
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
  y = addSectionTitle(doc, "Service Request Log", y);
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
  y = addSectionTitle(doc, "Completed Service History", y);
  const compHeaders = ["Date", "Volunteer", "Elder", "Services", "Time Slot"];
  const compRows = data.completedAssignments.map((a) => [
    formatTimestamp(a.serviceDateTS as number | { toMillis?: () => number }),
    a.volunteerEmail || "",
    a.elderName || "",
    Array.isArray(a.services) ? a.services.join(", ") : (a.servicesStr || ""),
    `${a.startTimeText || ""} - ${a.endTimeText || ""}`,
  ]);
  addDataTable(doc, compHeaders, compRows, y);

  const filename = `ElderEase-Admin-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
