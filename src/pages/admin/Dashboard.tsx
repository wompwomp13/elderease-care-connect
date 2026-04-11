import { useEffect, useMemo, useState, type CSSProperties } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, ClipboardList, Star, Award, ChevronRight, X,
  ArrowUpRight, ArrowDownRight, User as UserIcon, Lightbulb,
  Download, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area,
} from "recharts";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  periodChange, buildForecastSeries, confidenceBadge, type ForecastMethod,
} from "@/lib/forecast";
import { generateAdminReport, isInDateRange } from "@/lib/report-utils";
import { ReportDateRangeDialog, type ReportDateRangeConfirm } from "@/components/reports/ReportDateRangeDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServicePeriodFilter = "weekly" | "monthly" | "yearly";
type ForecastWindow = 3 | 6 | 12;
type ForecastHorizon = 1 | 2 | 3;

/** Maps a period label to the default forecast history window. */
const periodToForecastWindow: Record<ServicePeriodFilter, ForecastWindow> = {
  weekly: 3,
  monthly: 6,
  yearly: 12,
};

/** Shared Recharts tooltip panel style */
const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

type TooltipPayloadEntry = {
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
  color?: string;
};

/** Set as name= on every forecast uncertainty <Area> so tooltips can hide them reliably. */
const FORECAST_BAND_AREA_NAME = "__forecastRangeBand";

/** Stacked Area series used only for the shaded forecast band — omit from tooltips. */
function isForecastBandPayloadEntry(p: TooltipPayloadEntry): boolean {
  if (p.name === FORECAST_BAND_AREA_NAME) return true;
  const dk = String(p.dataKey ?? "").toLowerCase();
  const nm = String(p.name ?? "").toLowerCase();
  return (
    dk.includes("bandlow") ||
    dk.includes("banddiff") ||
    nm.includes("bandlow") ||
    nm.includes("banddiff") ||
    dk === "fcbandlow" ||
    dk === "fcbanddiff"
  );
}

/** Tooltip that hides internal band series so users only see actual + forecast lines. */
function BandAwareTooltip({
  active,
  payload,
  label,
  labelPrefix,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  labelPrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => !isForecastBandPayloadEntry(p));
  if (!rows.length) return null;
  const header =
    labelPrefix != null && labelPrefix !== "" ? `${labelPrefix}: ${label}` : String(label ?? "");
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-md" style={CHART_TOOLTIP_STYLE}>
      <p className="font-medium mb-1.5 text-foreground">{header}</p>
      <ul className="space-y-1">
        {rows.map((entry, i) => (
          <li key={i} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              {entry.color ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              ) : null}
              <span className="truncate text-muted-foreground">
                {entry.name != null && entry.name !== ""
                  ? String(entry.name)
                  : String(entry.dataKey ?? "")}
              </span>
            </span>
            <span className="shrink-0 tabular-nums font-medium text-foreground">
              {entry.value == null ? "—" : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  // --- Local UI state ---
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);
  const [globalPeriod, setGlobalPeriod] = useState<ServicePeriodFilter>("monthly");
  const [servicePeriodFilter, setServicePeriodFilter] = useState<ServicePeriodFilter>("monthly");
  const [cancelPeriodFilter, setCancelPeriodFilter] = useState<ServicePeriodFilter>("monthly");
  const [volunteerPeriodFilter, setVolunteerPeriodFilter] = useState<ServicePeriodFilter>("monthly");
  const [monthlyChartToggle, setMonthlyChartToggle] = useState<"completed" | "requests">("completed");

  // --- Forecast controls (global) ---
  const [forecastWindow, setForecastWindow] = useState<ForecastWindow>(6);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>(2);
  const [forecastMethod, setForecastMethod] = useState<ForecastMethod>("trend");
  const [adminReportRangeOpen, setAdminReportRangeOpen] = useState(false);
  const [forecastSidebarOpen, setForecastSidebarOpen] = useState(false);

  useEffect(() => {
    if (!forecastSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setForecastSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forecastSidebarOpen]);

  // --- Live Firestore collections ---
  const [requests, setRequests] = useState<any[] | null>(null);
  const [approvedVolunteers, setApprovedVolunteers] = useState<any[] | null>(null);
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { sum: number; count: number }>>({});
  const [ratingEvents, setRatingEvents] = useState<{ email: string; rating: number; atMs: number }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "serviceRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const qv = query(collection(db, "pendingVolunteers"), where("status", "==", "approved"));
    const unsub = onSnapshot(qv, (snap) => {
      setApprovedVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const map: Record<string, { sum: number; count: number }> = {};
      const events: { email: string; rating: number; atMs: number }[] = [];
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const email = (r.volunteerEmail || "").toLowerCase();
        const val = Number(r.rating) || 0;
        if (!email || val <= 0) return;
        if (!map[email]) map[email] = { sum: 0, count: 0 };
        map[email].sum += val;
        map[email].count += 1;
        const atMs =
          typeof r.atMs === "number"
            ? r.atMs
            : (r.atMs?.toMillis?.() ?? typeof r.createdAt === "number"
                ? r.createdAt
                : (r.createdAt?.toMillis?.() ?? 0));
        if (atMs) events.push({ email, rating: val, atMs });
      });
      setRatingsMap(map);
      setRatingEvents(events);
    });
    return () => unsub();
  }, []);

  // ─── Timestamp helpers ──────────────────────────────────────────────────────

  const getRequestCreatedMs = (r: any): number => {
    const ts = r.createdAt;
    if (!ts) return 0;
    return typeof ts === "number" ? ts : (ts?.toMillis?.() ?? 0);
  };

  const getCancelledMs = (r: any): number => {
    const ts = r.cancelledAt ?? r.createdAt;
    if (!ts) return 0;
    return typeof ts === "number" ? ts : (ts?.toMillis?.() ?? 0);
  };

  // Guardian-confirmed completion gate — DO NOT CHANGE
  const isCompletedConfirmed = (a: any) => a.status === "completed" && a.guardianConfirmed === true;
  const getDateMs = (a: any) => {
    const ms = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
    return ms || 0;
  };

  const REASON_LABELS: Record<string, string> = {
    schedule_change: "Schedule changed",
    price_high: "Price too high",
    preferred_unavailable: "Preferred volunteer unavailable",
    entered_wrong_info: "Entered wrong information",
    other: "Other",
  };

  // ─── Global-period derived values ───────────────────────────────────────────

  const now = new Date();
  const nowMs = now.getTime();
  const DAY = 24 * 60 * 60 * 1000;
  const globalPeriodMs =
    globalPeriod === "weekly" ? 7 * DAY : globalPeriod === "monthly" ? 30 * DAY : 365 * DAY;
  const globalCutoffMs = nowMs - globalPeriodMs;
  const globalPrevCutoffMs = nowMs - globalPeriodMs * 2;

  // ─── All-time counts (for report compatibility) ──────────────────────────────

  const totalRequests = requests?.length ?? 0;
  const pendingRequests = (requests || []).filter((r) => (r.status || "pending") === "pending").length;
  const activeVolunteers = approvedVolunteers?.length ?? 0;
  const cancelledRequests = (requests || []).filter((r) => r.status === "cancelled").length;

  // completedThisWeek kept for report
  const weekAgoMs = nowMs - 6 * DAY;
  const completedThisWeek = (assignments || []).filter(
    (a) => isCompletedConfirmed(a) && getDateMs(a) >= weekAgoMs
  ).length;

  // ─── Overview stat cards (5, period-based) ──────────────────────────────────

  const overviewStats = useMemo(() => {
    // --- Total requests (all statuses) in period ---
    const reqPeriod = (requests || []).filter((r) => getRequestCreatedMs(r) >= globalCutoffMs).length;
    const reqPrev = (requests || []).filter(
      (r) => getRequestCreatedMs(r) >= globalPrevCutoffMs && getRequestCreatedMs(r) < globalCutoffMs
    ).length;

    // --- Guardian-confirmed completions in period (serviceDateTS) ---
    const compPeriod = (assignments || []).filter(
      (a) => isCompletedConfirmed(a) && getDateMs(a) >= globalCutoffMs
    ).length;
    const compPrev = (assignments || []).filter(
      (a) =>
        isCompletedConfirmed(a) &&
        getDateMs(a) >= globalPrevCutoffMs &&
        getDateMs(a) < globalCutoffMs
    ).length;

    // --- Cancellations (cancelledAt) in period ---
    const cancelPeriod = (requests || []).filter(
      (r) => r.status === "cancelled" && getCancelledMs(r) >= globalCutoffMs
    ).length;
    const cancelPrev = (requests || []).filter(
      (r) =>
        r.status === "cancelled" &&
        getCancelledMs(r) >= globalPrevCutoffMs &&
        getCancelledMs(r) < globalCutoffMs
    ).length;

    // --- Average rating (atMs) in period ---
    const ratingEventsInPeriod = ratingEvents.filter((e) => e.atMs >= globalCutoffMs);
    const ratingEventsInPrev = ratingEvents.filter(
      (e) => e.atMs >= globalPrevCutoffMs && e.atMs < globalCutoffMs
    );
    const avgRatingPeriod =
      ratingEventsInPeriod.length > 0
        ? ratingEventsInPeriod.reduce((s, e) => s + e.rating, 0) / ratingEventsInPeriod.length
        : null;
    const avgRatingPrev =
      ratingEventsInPrev.length > 0
        ? ratingEventsInPrev.reduce((s, e) => s + e.rating, 0) / ratingEventsInPrev.length
        : null;

    // --- Fulfillment rate: completions ÷ non-cancelled requests in period ---
    const nonCancelledPeriod = (requests || []).filter(
      (r) => r.status !== "cancelled" && getRequestCreatedMs(r) >= globalCutoffMs
    ).length;
    const fulfillRate =
      nonCancelledPeriod > 0 ? Math.round((compPeriod / nonCancelledPeriod) * 1000) / 10 : 0;
    const nonCancelledPrev = (requests || []).filter(
      (r) =>
        r.status !== "cancelled" &&
        getRequestCreatedMs(r) >= globalPrevCutoffMs &&
        getRequestCreatedMs(r) < globalCutoffMs
    ).length;
    const fulfillRatePrev =
      nonCancelledPrev > 0 ? Math.round((compPrev / nonCancelledPrev) * 1000) / 10 : 0;

    return {
      reqPeriod,
      reqChange: periodChange(reqPeriod, reqPrev),
      compPeriod,
      compChange: periodChange(compPeriod, compPrev),
      cancelPeriod,
      cancelChange: periodChange(cancelPeriod, cancelPrev),
      avgRatingPeriod: avgRatingPeriod != null ? Math.round(avgRatingPeriod * 100) / 100 : null,
      avgRatingPrev: avgRatingPrev != null ? Math.round(avgRatingPrev * 100) / 100 : null,
      ratingCount: ratingEventsInPeriod.length,
      fulfillRate,
      fulfillChange: periodChange(fulfillRate, fulfillRatePrev),
    };
  }, [requests, assignments, ratingEvents, globalCutoffMs, globalPrevCutoffMs]);

  // ─── Rating quality trend (monthly avg — for Volunteer Analytics + signals) ──

  const ratingQualityTrend = useMemo(() => {
    const cur = new Date();
    const months: { key: string; label: string; sum: number; count: number }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        sum: 0,
        count: 0,
      });
    }
    ratingEvents.forEach((e) => {
      if (!e.atMs) return;
      const d = new Date(e.atMs);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((m) => m.key === key);
      if (m) { m.sum += e.rating; m.count += 1; }
    });

    const monthsWithData = months.filter((m) => m.count > 0).length;
    const chartData = months.map((m) => ({
      month: m.label,
      avg: m.count > 0 ? Math.round((m.sum / m.count) * 100) / 100 : null,
    }));

    const activeMonths = months.filter((m) => m.count > 0);
    const latestMonth = activeMonths[activeMonths.length - 1];
    const latestAvg = latestMonth ? Math.round((latestMonth.sum / latestMonth.count) * 100) / 100 : null;

    if (monthsWithData < 3) {
      return {
        status: "building" as const,
        label: "Building history — check back next month",
        chartData,
        monthsWithData,
        latestAvg,
      };
    }

    const half = Math.floor(activeMonths.length / 2);
    const firstHalf = activeMonths.slice(0, half);
    const secondHalf = activeMonths.slice(half);
    const avg1 =
      firstHalf.length > 0
        ? firstHalf.reduce((s, m) => s + m.sum / m.count, 0) / firstHalf.length
        : 0;
    const avg2 =
      secondHalf.length > 0
        ? secondHalf.reduce((s, m) => s + m.sum / m.count, 0) / secondHalf.length
        : 0;

    let status: "improving" | "declining" | "stable";
    if (avg2 > avg1 + 0.2) status = "improving";
    else if (avg2 < avg1 - 0.2) status = "declining";
    else status = "stable";

    return {
      status,
      label: status === "improving" ? "Improving" : status === "declining" ? "Declining" : "Stable",
      chartData,
      monthsWithData,
      latestAvg,
    };
  }, [ratingEvents, forecastWindow]);

  // ─── Signal summaries ("What this means for you") ───────────────────────────

  const signalSummaries = useMemo(() => {
    const signals: { icon: "ok" | "warn" | "info"; text: string }[] = [];

    // Fulfillment signal
    if (overviewStats.fulfillRate < 70) {
      signals.push({
        icon: "warn",
        text: `⚠️ Only ${overviewStats.fulfillRate}% of requests are being fulfilled — consider recruiting more volunteers.`,
      });
    }

    // Rating signal
    const { status: rStatus, latestAvg, monthsWithData } = ratingQualityTrend;
    if (
      rStatus === "declining" ||
      (latestAvg != null && latestAvg < 4.0 && monthsWithData >= 3)
    ) {
      const qual = rStatus === "declining" ? "declining" : "below target";
      const avgStr = latestAvg != null ? latestAvg.toFixed(2) : "—";
      signals.push({
        icon: "warn",
        text: `⭐ Service quality is ${qual} — avg rating ${avgStr} this period.`,
      });
    }

    return signals;
  }, [overviewStats, ratingQualityTrend]);

  // ─── Monthly trend (completed services) — kept for report + Request Analytics ─

  const monthlyTrend = useMemo(() => {
    const cur = new Date(now);
    const months: { month: string; services: number; key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ month: d.toLocaleString(undefined, { month: "short" }), services: 0, key });
    }
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].services += 1;
    });
    const values = months.map((m) => m.services);
    const built = buildForecastSeries(values, forecastWindow, forecastHorizon, forecastMethod);
    const historical = months.map(({ month, services }) => ({
      month,
      services,
      forecast: null as number | null,
      fcBandLow: null as number | null,
      fcBandDiff: null as number | null,
    }));
    if (built.insufficient || !built.forecast) return historical;
    const lastHist = historical[historical.length - 1];
    if (lastHist) lastHist.forecast = lastHist.services;
    const cur2 = new Date(now);
    const nextMonths = built.forecast.map((val, i) => {
      const d = new Date(cur2.getFullYear(), cur2.getMonth() + i + 1, 1);
      const low = built.low?.[i] ?? null;
      const high = built.high?.[i] ?? null;
      return {
        month: d.toLocaleString(undefined, { month: "short" }),
        services: null as number | null,
        forecast: Math.round(val),
        fcBandLow: low,
        fcBandDiff: low != null && high != null ? Math.max(0, high - low) : null,
      };
    });
    return [...historical, ...nextMonths];
  }, [assignments, forecastWindow, forecastHorizon, forecastMethod]);

  // ─── Monthly requests trend (non-cancelled, for Request Analytics toggle) ───

  const monthlyRequestsTrend = useMemo(() => {
    const cur = new Date(now);
    const months: { month: string; services: number; key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ month: d.toLocaleString(undefined, { month: "short" }), services: 0, key });
    }
    // Demand = non-cancelled requests by createdAt
    (requests || []).forEach((r) => {
      if (r.status === "cancelled") return;
      const ms = getRequestCreatedMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].services += 1;
    });
    const values = months.map((m) => m.services);
    const built = buildForecastSeries(values, forecastWindow, forecastHorizon, forecastMethod);
    const historical = months.map(({ month, services }) => ({
      month,
      services,
      forecast: null as number | null,
      fcBandLow: null as number | null,
      fcBandDiff: null as number | null,
    }));
    if (built.insufficient || !built.forecast) return historical;
    const lastHist = historical[historical.length - 1];
    if (lastHist) lastHist.forecast = lastHist.services;
    const cur2 = new Date(now);
    const nextMonths = built.forecast.map((val, i) => {
      const d = new Date(cur2.getFullYear(), cur2.getMonth() + i + 1, 1);
      const low = built.low?.[i] ?? null;
      const high = built.high?.[i] ?? null;
      return {
        month: d.toLocaleString(undefined, { month: "short" }),
        services: null as number | null,
        forecast: Math.round(val),
        fcBandLow: low,
        fcBandDiff: low != null && high != null ? Math.max(0, high - low) : null,
      };
    });
    return [...historical, ...nextMonths];
  }, [requests, forecastWindow, forecastHorizon, forecastMethod]);

  // ─── tasksMap (all-time completions by email) ───────────────────────────────

  const tasksMap: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const email = (a.volunteerEmail || "").toLowerCase();
      if (!email) return;
      counts[email] = (counts[email] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  // ─── Volunteer analytics (with prediction band data) ────────────────────────

  const volunteerAnalytics = useMemo(() => {
    const pMs =
      volunteerPeriodFilter === "weekly"
        ? 7 * DAY
        : volunteerPeriodFilter === "monthly"
          ? 30 * DAY
          : 365 * DAY;
    const cutoffMs = nowMs - pMs;
    const prevCutoffMs = nowMs - pMs * 2;

    const tasksInPeriod: Record<string, number> = {};
    const tasksPrevPeriod: Record<string, number> = {};
    let totalInPeriod = 0;
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const email = (a.volunteerEmail || "").toLowerCase();
      if (!email) return;
      if (ms >= cutoffMs) {
        tasksInPeriod[email] = (tasksInPeriod[email] || 0) + 1;
        totalInPeriod += 1;
      } else if (ms >= prevCutoffMs) {
        tasksPrevPeriod[email] = (tasksPrevPeriod[email] || 0) + 1;
      }
    });

    const list = (approvedVolunteers || [])
      .map((v) => {
        const emailKey = (v.email || "").toLowerCase();
        const r = ratingsMap[emailKey];
        const avg = r ? r.sum / r.count : null;
        const countAll = tasksMap[emailKey] || 0;
        const countPeriod = tasksInPeriod[emailKey] || 0;
        const countPrev = tasksPrevPeriod[emailKey] || 0;
        const growth =
          countPrev > 0
            ? Math.round(((countPeriod - countPrev) / countPrev) * 100)
            : countPeriod > 0
              ? 100
              : 0;
        const contribution =
          totalInPeriod > 0 ? Math.round((countPeriod / totalInPeriod) * 1000) / 10 : 0;
        return {
          id: v.id,
          emailKey,
          name: v.fullName || v.name || v.email || "Volunteer",
          rating: avg,
          reviews: r?.count || 0,
          services: countAll,
          servicesPeriod: countPeriod,
          servicesPrev: countPrev,
          growth,
          contribution,
          specialty: Array.isArray(v.services)
            ? v.services.slice(0, 2).join(" & ")
            : v.services || "Care Services",
          badge:
            avg && avg >= 4.8
              ? "Top Performer"
              : avg && avg >= 4.5
                ? "Rising Star"
                : "Volunteer",
          about: v.bio || "Reliable and compassionate volunteer.",
          education: v.education || "",
          method: v.method || "Client-centered care",
        };
      })
      .filter((v) => v.servicesPeriod > 0 || v.services > 0)
      .sort(
        (a, b) =>
          b.servicesPeriod - a.servicesPeriod ||
          (b.rating ?? 0) - (a.rating ?? 0) ||
          b.services - a.services
      );

    const topVolunteers = list.slice(0, 5);

    // Chart buckets
    const chartBuckets: { label: string; key: string; startMs: number; endMs: number }[] = [];
    if (volunteerPeriodFilter === "weekly") {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      for (let i = 5; i >= 0; i--) {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        chartBuckets.push({
          label: weekStart.toLocaleString(undefined, { month: "short", day: "numeric" }),
          key: `w-${weekStart.getTime()}`,
          startMs: weekStart.getTime(),
          endMs: weekEnd.getTime(),
        });
      }
    } else if (volunteerPeriodFilter === "yearly") {
      for (let i = 3; i >= 0; i--) {
        const y = now.getFullYear() - i;
        chartBuckets.push({
          label: String(y),
          key: String(y),
          startMs: new Date(y, 0, 1).getTime(),
          endMs: new Date(y + 1, 0, 1).getTime(),
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chartBuckets.push({
          label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
          key: `${d.getFullYear()}-${d.getMonth()}`,
          startMs: d.getTime(),
          endMs: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
        });
      }
    }

    const byEmailByBucket: Record<string, number[]> = {};
    topVolunteers.forEach((v) => { byEmailByBucket[v.emailKey] = chartBuckets.map(() => 0); });
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const email = (a.volunteerEmail || "").toLowerCase();
      if (!byEmailByBucket[email]) return;
      const idx = chartBuckets.findIndex((b) => ms >= b.startMs && ms < b.endMs);
      if (idx >= 0) byEmailByBucket[email][idx] += 1;
    });

    const top3 = topVolunteers.slice(0, 3);
    const forecastByVolunteerId: Record<string, ReturnType<typeof buildForecastSeries>> = {};
    top3.forEach((v) => {
      forecastByVolunteerId[v.id] = buildForecastSeries(
        byEmailByBucket[v.emailKey] || [],
        forecastWindow,
        forecastHorizon,
        forecastMethod
      );
    });

    let topThreeForecastInsufficient = false;
    let topThreeForecastSum = 0;
    top3.forEach((v) => {
      const b = forecastByVolunteerId[v.id];
      if (b.insufficient || !b.forecast) topThreeForecastInsufficient = true;
      else topThreeForecastSum += Math.round(b.forecast[0]);
    });

    // Historical chart rows (bands null for historical)
    const trendChartDataBase = chartBuckets.map((b, idx) => {
      const row: Record<string, string | number | null> = { label: b.label };
      top3.forEach((v) => {
        row[`v_${v.id}`] = byEmailByBucket[v.emailKey]?.[idx] ?? 0;
        row[`v_${v.id}_fc`] = null;
        row[`v_${v.id}_bandLow`] = null;
        row[`v_${v.id}_bandDiff`] = null;
      });
      return row;
    });

    // Forecast rows (include bands)
    const lastBucket = chartBuckets[chartBuckets.length - 1];
    const forecastRows: Record<string, string | number | null>[] = [];
    for (let step = 0; step < forecastHorizon; step++) {
      let label: string;
      if (volunteerPeriodFilter === "weekly") {
        const t = lastBucket.endMs + step * 7 * DAY;
        label = new Date(t).toLocaleString(undefined, { month: "short", day: "numeric" });
      } else if (volunteerPeriodFilter === "yearly") {
        const y0 = new Date(lastBucket.startMs).getFullYear();
        label = String(y0 + step + 1);
      } else {
        const d = new Date(lastBucket.startMs);
        const nd = new Date(d.getFullYear(), d.getMonth() + step + 1, 1);
        label = nd.toLocaleString(undefined, { month: "short", year: "2-digit" });
      }
      const row: Record<string, string | number | null> = { label };
      top3.forEach((v) => {
        row[`v_${v.id}`] = null;
        const b = forecastByVolunteerId[v.id];
        const p = b.forecast?.[step];
        row[`v_${v.id}_fc`] = !b.insufficient && p != null ? Math.round(p) : null;
        const low = b.low?.[step] ?? null;
        const high = b.high?.[step] ?? null;
        row[`v_${v.id}_bandLow`] =
          !b.insufficient && low != null ? low : null;
        row[`v_${v.id}_bandDiff`] =
          !b.insufficient && low != null && high != null
            ? Math.max(0, high - low)
            : null;
      });
      forecastRows.push(row);
    }

    // Connection point at last historical bucket
    const lastBase = trendChartDataBase[trendChartDataBase.length - 1];
    if (lastBase) {
      top3.forEach((v) => {
        const b = forecastByVolunteerId[v.id];
        if (!b.insufficient && b.forecast) {
          lastBase[`v_${v.id}_fc`] = lastBase[`v_${v.id}`];
        }
      });
    }

    const trendChartData = [...trendChartDataBase, ...forecastRows];

    const chartTitle =
      volunteerPeriodFilter === "weekly"
        ? "Top 3 volunteers – services per week (last 6 weeks)"
        : volunteerPeriodFilter === "yearly"
          ? "Top 3 volunteers – services per year (last 4 years)"
          : "Top 3 volunteers – services per month (last 6 months)";
    const chartXLabel =
      volunteerPeriodFilter === "weekly"
        ? "Week"
        : volunteerPeriodFilter === "yearly"
          ? "Year"
          : "Month";

    const approvedTotal = approvedVolunteers?.length ?? 0;
    let activeInPeriodCount = 0;
    let poolRatingSum = 0;
    let poolRatingCount = 0;
    let volunteersWithRatings = 0;
    let lifetimeCompletionsPool = 0;
    let activeInPeriodButUnrated = 0;
    (approvedVolunteers || []).forEach((v) => {
      const emailKey = (v.email || "").toLowerCase();
      if (!emailKey) return;
      const periodN = tasksInPeriod[emailKey] || 0;
      if (periodN > 0) {
        activeInPeriodCount += 1;
        const r = ratingsMap[emailKey];
        if (!r || r.count === 0) activeInPeriodButUnrated += 1;
      }
      const r = ratingsMap[emailKey];
      if (r && r.count > 0) {
        volunteersWithRatings += 1;
        poolRatingSum += r.sum;
        poolRatingCount += r.count;
      }
      lifetimeCompletionsPool += tasksMap[emailKey] || 0;
    });
    const poolAvgRating =
      poolRatingCount > 0 ? Math.round((poolRatingSum / poolRatingCount) * 100) / 100 : null;
    const avgCompletionsPerActiveInPeriod =
      activeInPeriodCount > 0
        ? Math.round((totalInPeriod / activeInPeriodCount) * 10) / 10
        : null;

    return {
      topVolunteers,
      totalInPeriod,
      trendChartData,
      topThreeForecastSum,
      topThreeForecastInsufficient,
      periodLabel:
        volunteerPeriodFilter === "weekly"
          ? "7 days"
          : volunteerPeriodFilter === "monthly"
            ? "30 days"
            : "12 months",
      chartTitle,
      chartXLabel,
      poolOverview: {
        approvedTotal,
        activeInPeriodCount,
        poolAvgRating,
        poolRatingCount,
        volunteersWithRatings,
        lifetimeCompletionsPool,
        avgCompletionsPerActiveInPeriod,
        activeInPeriodButUnrated,
      },
    };
  }, [
    approvedVolunteers, ratingsMap, tasksMap, assignments,
    volunteerPeriodFilter, forecastWindow, forecastHorizon, forecastMethod,
  ]);

  // ─── Service helpers ─────────────────────────────────────────────────────────

  const toServiceId = (nameOrId: string): string => {
    const v = (nameOrId || "").toLowerCase();
    if (v.includes("companionship")) return "companionship";
    if (v.includes("housekeeping")) return "housekeeping";
    if (v.includes("errand")) return "errands";
    if (v.includes("visit")) return "visits";
    if (v.includes("social")) return "socialization";
    return v;
  };
  const toDisplayName = (id: string): string => {
    switch (id) {
      case "companionship": return "Companionship";
      case "housekeeping": return "Light Housekeeping";
      case "errands": return "Running Errands";
      case "visits": return "Home Visits";
      case "socialization": return "Socialization";
      default: return id?.charAt(0).toUpperCase() + id?.slice(1);
    }
  };

  // ─── Capacity vs demand (1a fix: demand = non-cancelled by createdAt) ────────

  const capacityForecast = useMemo(() => {
    const cur = new Date();
    const months: { key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    const completedByMonth = months.map(() => 0);
    const requestsByMonth = months.map(() => 0);
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const d = new Date(ms);
      const idx = months.findIndex((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (idx >= 0) completedByMonth[idx] += 1;
    });
    // Demand = non-cancelled requests by createdAt
    (requests || []).forEach((r) => {
      if (r.status === "cancelled") return;
      const ms = getRequestCreatedMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const idx = months.findIndex((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (idx >= 0) requestsByMonth[idx] += 1;
    });
    const capBuilt = buildForecastSeries(completedByMonth, forecastWindow, forecastHorizon, forecastMethod);
    const demBuilt = buildForecastSeries(requestsByMonth, forecastWindow, forecastHorizon, forecastMethod);
    const insufficient = capBuilt.insufficient || demBuilt.insufficient;

    // All forecast steps
    const steps = Array.from({ length: forecastHorizon }, (_, i) => {
      const cap = !insufficient && capBuilt.forecast ? Math.round(capBuilt.forecast[i] ?? 0) : 0;
      const dem = !insufficient && demBuilt.forecast ? Math.round(demBuilt.forecast[i] ?? 0) : 0;
      const capLow = capBuilt.low?.[i] ?? cap;
      const capHigh = capBuilt.high?.[i] ?? cap;
      const demLow = demBuilt.low?.[i] ?? dem;
      const demHigh = demBuilt.high?.[i] ?? dem;
      const gap = dem - cap;
      return {
        step: i + 1,
        projectedCapacity: cap,
        forecastedDemand: dem,
        capLow: Math.round(capLow),
        capHigh: Math.round(capHigh),
        demLow: Math.round(demLow),
        demHigh: Math.round(demHigh),
        gap,
        status:
          insufficient
            ? ("balanced" as const)
            : gap > 2
              ? ("shortage" as const)
              : gap < -2
                ? ("surplus" as const)
                : ("balanced" as const),
      };
    });

    const first = steps[0];
    return {
      // Legacy flat shape preserved for report
      projectedCapacity: first?.projectedCapacity ?? 0,
      forecastedDemand: first?.forecastedDemand ?? 0,
      gap: first?.gap ?? 0,
      status: first?.status ?? "balanced",
      insufficient,
      // All steps for Overview card
      steps,
      capBadge: confidenceBadge(capBuilt.validDataMonthCount, capBuilt.cv),
      demBadge: confidenceBadge(demBuilt.validDataMonthCount, demBuilt.cv),
    };
  }, [assignments, requests, forecastWindow, forecastHorizon, forecastMethod]);

  // ─── Service demand forecast (1a fix: exclude cancelled) ────────────────────

  const serviceDemandForecast = useMemo(() => {
    const cur = new Date();
    const months: { month: string; key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
      });
    }
    const serviceIds = ["companionship", "housekeeping", "errands", "visits", "socialization"];
    const byService: Record<string, number[]> = {};
    serviceIds.forEach((id) => { byService[id] = months.map(() => 0); });
    // Demand = non-cancelled requests
    (requests || []).forEach((r) => {
      if (r.status === "cancelled") return;
      const ms = getRequestCreatedMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx < 0) return;
      const arr: string[] = Array.isArray(r.services) ? r.services : r.service ? [r.service] : [];
      arr.forEach((s) => {
        const id = toServiceId(s);
        if (byService[id]) byService[id][idx] += 1;
      });
    });
    const result: {
      name: string;
      current: number;
      forecast: number;
      forecastLow: number;
      forecastHigh: number;
      insufficient: boolean;
      badge: { color: "green" | "yellow" | "red"; label: string };
    }[] = [];
    serviceIds.forEach((id) => {
      const vals = byService[id];
      const total = vals.reduce((a, b) => a + b, 0);
      if (total === 0) return;
      const built = buildForecastSeries(vals, forecastWindow, forecastHorizon, forecastMethod);
      const fc = built.insufficient || !built.forecast ? 0 : Math.round(built.forecast[0]);
      result.push({
        name: toDisplayName(id),
        current: vals[vals.length - 1] ?? 0,
        forecast: fc,
        forecastLow: built.insufficient ? 0 : Math.round(built.low?.[0] ?? fc),
        forecastHigh: built.insufficient ? 0 : Math.round(built.high?.[0] ?? fc),
        insufficient: built.insufficient,
        badge: confidenceBadge(built.validDataMonthCount, built.cv),
      });
    });
    return result.sort((a, b) => b.forecast - a.forecast);
  }, [requests, forecastWindow, forecastHorizon, forecastMethod]);

  const requestVolumeForecastSummary = useMemo(() => {
    const ok = serviceDemandForecast.filter((s) => !s.insufficient);
    const totalNext = ok.reduce((acc, s) => acc + s.forecast, 0);
    const anyRow = serviceDemandForecast.length > 0;
    const allInsufficient = anyRow && ok.length === 0;
    return { totalNext, top3: ok.slice(0, 3), anyRow, allInsufficient };
  }, [serviceDemandForecast]);

  // ─── Most requested services (1a fix: exclude cancelled) ────────────────────

  const topServices = useMemo(() => {
    const pMs =
      servicePeriodFilter === "weekly"
        ? 7 * DAY
        : servicePeriodFilter === "monthly"
          ? 30 * DAY
          : 365 * DAY;
    const cutoffMs = nowMs - pMs;
    const counts: Record<string, number> = {};
    (requests || []).forEach((r) => {
      if (r.status === "cancelled") return;
      const createdMs = getRequestCreatedMs(r);
      if (createdMs < cutoffMs) return;
      const arr: string[] = Array.isArray(r.services) ? r.services : r.service ? [r.service] : [];
      arr.forEach((s) => {
        const id = toServiceId(s);
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, [, n]) => acc + n, 0) || 1;
    return entries.map(([id, n]) => ({
      name: toDisplayName(id),
      requests: n,
      percentage: Math.round((n / total) * 1000) / 10,
    }));
  }, [requests, servicePeriodFilter]);

  // ─── Pending by period (uses forecastWindow for range) ──────────────────────

  const pendingByPeriod = useMemo(() => {
    const cur = new Date();
    const months: { month: string; pending: number; key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        pending: 0,
        key,
      });
    }
    (requests || []).forEach((r) => {
      if ((r.status || "pending") !== "pending") return;
      const ms = getRequestCreatedMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].pending += 1;
    });
    const total = months.reduce((s, m) => s + m.pending, 0);
    return { total, chartData: months.map(({ month, pending }) => ({ month, pending })) };
  }, [requests, forecastWindow]);

  // ─── Cancellation analytics (with prediction band data) ─────────────────────

  const cancellationAnalytics = useMemo(() => {
    const pMs =
      cancelPeriodFilter === "weekly"
        ? 7 * DAY
        : cancelPeriodFilter === "monthly"
          ? 30 * DAY
          : 365 * DAY;
    const cutoffMs = nowMs - pMs;

    const cancelledInPeriod = (requests || []).filter(
      (r) => r.status === "cancelled" && getCancelledMs(r) >= cutoffMs
    );
    const totalInPeriod = (requests || []).filter(
      (r) => getRequestCreatedMs(r) >= cutoffMs
    ).length;
    const rate =
      totalInPeriod > 0
        ? Math.round((cancelledInPeriod.length / totalInPeriod) * 1000) / 10
        : 0;

    const reasonCounts: Record<string, number> = {};
    cancelledInPeriod.forEach((r) => {
      const code = r.cancelReasonCode || "other";
      reasonCounts[code] = (reasonCounts[code] || 0) + 1;
    });
    const totalCancelled = cancelledInPeriod.length;
    const reasonData = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({
        name: REASON_LABELS[code] || code,
        value: count,
        percentage:
          totalCancelled > 0 ? Math.round((count / totalCancelled) * 1000) / 10 : 0,
      }));

    const cur = new Date();
    const months: { month: string; cancelled: number; key: string }[] = [];
    for (let i = forecastWindow - 1; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        cancelled: 0,
        key,
      });
    }
    (requests || []).forEach((r) => {
      if (r.status !== "cancelled") return;
      const ms = getCancelledMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].cancelled += 1;
    });

    const cancelValues = months.map((m) => m.cancelled);
    const cancelBuilt = buildForecastSeries(
      cancelValues, forecastWindow, forecastHorizon, forecastMethod
    );

    type CancelRow = {
      month: string;
      cancelled: number | null;
      cancelledFc: number | null;
      fcBandLow: number | null;
      fcBandDiff: number | null;
    };
    let cancellationChartData: CancelRow[];
    if (cancelBuilt.insufficient || !cancelBuilt.forecast) {
      cancellationChartData = months.map(({ month, cancelled }) => ({
        month, cancelled, cancelledFc: null, fcBandLow: null, fcBandDiff: null,
      }));
    } else {
      const hist: CancelRow[] = months.map(({ month, cancelled }) => ({
        month, cancelled, cancelledFc: null, fcBandLow: null, fcBandDiff: null,
      }));
      const lastH = hist[hist.length - 1];
      if (lastH) lastH.cancelledFc = lastH.cancelled;
      const fcRows: CancelRow[] = cancelBuilt.forecast.map((val, i) => {
        const d = new Date(cur.getFullYear(), cur.getMonth() + i + 1, 1);
        const low = cancelBuilt.low?.[i] ?? null;
        const high = cancelBuilt.high?.[i] ?? null;
        return {
          month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
          cancelled: null,
          cancelledFc: Math.round(val),
          fcBandLow: low,
          fcBandDiff: low != null && high != null ? Math.max(0, high - low) : null,
        };
      });
      cancellationChartData = [...hist, ...fcRows];
    }

    const cancellationForecastIncreasing =
      !cancelBuilt.insufficient &&
      cancelBuilt.forecast != null &&
      cancelBuilt.forecast[0] > cancelBuilt.lastActual;

    const topReason = reasonData[0];
    const insights: string[] = [];
    if (rate > 15)
      insights.push("Cancellation rate is above 15% — consider reviewing scheduling or pricing flow.");
    if (topReason?.name === "Schedule changed")
      insights.push('"Schedule changed" is the top reason — flexible rescheduling options may help.');
    if (topReason?.name === "Preferred volunteer unavailable")
      insights.push("Preferred volunteer availability gaps — consider broadening recommendations.");
    if (topReason?.name === "Price too high")
      insights.push("Price sensitivity noted — dynamic pricing or discounts could improve conversion.");
    if (topReason?.name === "Entered wrong information")
      insights.push("Data entry errors — consider simplifying the form or adding validation.");
    if (totalCancelled === 0 && totalInPeriod > 0)
      insights.push("No cancellations in this period — retention looks strong.");
    if (totalCancelled > 0 && insights.length === 0)
      insights.push("Review cancellation patterns to identify improvement opportunities.");
    if (cancellationForecastIncreasing)
      insights.push("Projected cancellations are increasing.");

    return {
      total: cancelledInPeriod.length,
      rate,
      totalInPeriod,
      reasonData,
      chartData: cancellationChartData,
      cancellationForecastInsufficient: cancelBuilt.insufficient,
      topReason,
      insights,
    };
  }, [requests, cancelPeriodFilter, forecastWindow, forecastHorizon, forecastMethod]);

  // ─── Volunteer accept / decline (Operations — same period as cancellations) ─

  const volunteerAcceptanceAnalytics = useMemo(() => {
    const pMs =
      cancelPeriodFilter === "weekly"
        ? 7 * DAY
        : cancelPeriodFilter === "monthly"
          ? 30 * DAY
          : 365 * DAY;
    const cutoffMs = nowMs - pMs;
    const ts = (v: any): number =>
      typeof v === "number" ? v : (v?.toMillis?.() ?? 0);

    let accepts = 0;
    let declinesFromAssignment = 0;
    (assignments || []).forEach((a) => {
      if (a.acceptedByVolunteer === true) {
        let accMs = ts(a.acceptedByVolunteerAt);
        if (!accMs) accMs = ts(a.updatedAt) || ts(a.createdAt);
        if (accMs >= cutoffMs) accepts += 1;
      }
      if (a.status === "declined") {
        let dMs = ts(a.declinedAt);
        if (!dMs) dMs = ts(a.updatedAt);
        if (dMs >= cutoffMs) declinesFromAssignment += 1;
      }
    });

    let declinesPreferred = 0;
    (requests || []).forEach((r) => {
      const dMs = ts(r.preferredVolunteerDeclinedAt);
      if (dMs < cutoffMs) return;
      const by = r.preferredVolunteerDeclinedBy;
      if (Array.isArray(by) && by.length > 0) declinesPreferred += 1;
    });

    const declines = declinesFromAssignment + declinesPreferred;
    const decided = accepts + declines;
    const acceptanceRatePct =
      decided > 0 ? Math.round((accepts / decided) * 1000) / 10 : null;

    let pendingOffers = 0;
    (assignments || []).forEach((a) => {
      if ((a.status || "") !== "assigned") return;
      if (a.acceptedByVolunteer === true) return;
      pendingOffers += 1;
    });

    const insights: string[] = [];
    if (acceptanceRatePct != null && acceptanceRatePct < 65 && decided >= 5) {
      insights.push(
        `Volunteer acceptance rate is ${acceptanceRatePct}% (${accepts} accept${accepts !== 1 ? "s" : ""} vs ${declines} decline${declines !== 1 ? "s" : ""} in this window) — consider workload, fit, or volunteer availability.`
      );
    }
    if (pendingOffers >= 5) {
      insights.push(
        `${pendingOffers} assignment${pendingOffers !== 1 ? "s are" : " is"} still awaiting volunteer accept or decline.`
      );
    }
    if (declinesPreferred > 0 && decided >= 4 && declinesPreferred / decided >= 0.35) {
      insights.push(
        "A large share of declines are preferred-volunteer (guardian-chosen) requests — backup matching may help."
      );
    }

    return {
      accepts,
      declines,
      declinesFromAssignment,
      declinesPreferred,
      decided,
      acceptanceRatePct,
      pendingOffers,
      insights,
    };
  }, [assignments, requests, cancelPeriodFilter, nowMs, DAY]);

  // ─── Download report ─────────────────────────────────────────────────────────

  const runAdminReportDownload = async (range: ReportDateRangeConfirm) => {
    const completedAll = (assignments || []).filter(
      (a) => a.status === "completed" && a.guardianConfirmed
    );
    const completedFiltered = completedAll.filter((a) =>
      isInDateRange(a.serviceDateTS, range.startMs, range.endMs)
    );
    const reqFiltered = (requests || []).filter((r) =>
      isInDateRange(r.createdAt, range.startMs, range.endMs)
    );
    const qv = query(
      collection(db, "pendingVolunteers"),
      where("status", "in", ["approved"])
    );
    const snap = await getDocs(qv);
    const fromPending = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((v) => (v.status || "").toLowerCase() === "approved");
    const seenEmails = new Set<string>();
    const allVolunteers: Array<{
      name: string; email: string; rating: number | null;
      totalServices: number; specialty: string;
    }> = [];
    for (const v of fromPending) {
      const emailKey = (v.email || "").toLowerCase();
      if (!emailKey || seenEmails.has(emailKey)) continue;
      seenEmails.add(emailKey);
      const r = ratingsMap[emailKey];
      const avg = r ? r.sum / r.count : null;
      allVolunteers.push({
        name: v.fullName || v.name || v.email || "Volunteer",
        email: emailKey,
        rating: avg,
        totalServices: tasksMap[emailKey] || 0,
        specialty: Array.isArray(v.services)
          ? v.services.slice(0, 2).join(" & ")
          : v.services || "Care Services",
      });
    }
    for (const a of completedAll) {
      const emailKey = (a.volunteerEmail || "").toLowerCase();
      if (!emailKey || seenEmails.has(emailKey)) continue;
      seenEmails.add(emailKey);
      const r = ratingsMap[emailKey];
      const avg = r ? r.sum / r.count : null;
      allVolunteers.push({
        name: emailKey, email: emailKey, rating: avg,
        totalServices: tasksMap[emailKey] || 0, specialty: "—",
      });
    }
    allVolunteers.sort((a, b) => a.name.localeCompare(b.name));
    generateAdminReport({
      dateRangeLabel: range.label,
      requestsInPeriodCount: reqFiltered.length,
      completedInPeriodCount: completedFiltered.length,
      totalRequests,
      pendingRequests,
      activeVolunteers,
      completedThisWeek,
      cancellationRate: cancellationAnalytics.rate,
      capacityForecast,
      forecastMethod,
      serviceDemandForecast,
      cancellationReasons: cancellationAnalytics.reasonData,
      monthlyTrend,
      topServices,
      allVolunteers,
      requests: reqFiltered,
      completedAssignments: completedFiltered.map((a) => ({
        assignmentId: a.id,
        serviceDateTS: a.serviceDateTS,
        volunteerEmail: a.volunteerEmail,
        volunteerName: a.volunteerName,
        elderName: a.elderName,
        services: a.services,
        servicesStr: Array.isArray(a.services) ? a.services.join(", ") : a.services,
        startTimeText: a.startTimeText,
        endTimeText: a.endTimeText,
        receipt: a.receipt ?? null,
      })),
    });
  };

  const periodToggleClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  const volunteerColors = [
    "hsl(var(--primary))",
    "hsl(var(--primary-dark))",
    "hsl(198 63% 69%)",
  ] as const;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <ReportDateRangeDialog
        open={adminReportRangeOpen}
        onOpenChange={setAdminReportRangeOpen}
        onConfirm={(range) => void runAdminReportDownload(range)}
        title="Download admin report"
        description="Charts and summary figures match the live dashboard. The request log is filtered by when each request was submitted; completed history uses the service date."
      />

      {/* Forecast controls: floating launcher (bottom-right, chat-style) */}
      {forecastSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/45 backdrop-blur-[2px]"
          aria-label="Close forecast settings"
          onClick={() => setForecastSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed z-50 flex flex-col items-end gap-2 pointer-events-none",
          "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]"
        )}
      >
        {forecastSidebarOpen && (
          <div
            id="forecast-sidebar-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forecast-sidebar-title"
            className="pointer-events-auto mb-1 flex max-h-[min(32rem,calc(100dvh-5.5rem))] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl ring-1 ring-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Settings2 className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id="forecast-sidebar-title" className="truncate text-sm font-semibold">
                    Forecast settings
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    All forecast charts use these options
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setForecastSidebarOpen(false)}
                aria-label="Close forecast settings"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <div className="mx-auto flex w-full flex-col gap-5">
                <div className="flex w-full flex-col gap-2">
                  <span className="text-sm font-semibold text-foreground">History</span>
                  <p className="text-xs text-muted-foreground">
                    Past months of data used for the model
                  </p>
                  <div className="flex w-full rounded-md border bg-muted/50 p-0.5">
                    {([3, 6, 12] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForecastWindow(n)}
                        className={cn(
                          "flex-1 rounded px-2 py-2 text-sm font-semibold",
                          forecastWindow === n
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n}mo
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    How far ahead to predict
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Future months on forecast lines
                  </p>
                  <div className="flex w-full rounded-md border bg-muted/50 p-0.5">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForecastHorizon(n)}
                        className={cn(
                          "flex-1 rounded px-2 py-2 text-sm font-semibold",
                          forecastHorizon === n
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n} mo
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2">
                  <span className="text-sm font-semibold text-foreground">Method</span>
                  <p className="text-xs text-muted-foreground">
                    Trend follows recent direction; Average repeats a typical month
                  </p>
                  <div className="flex w-full rounded-md border bg-muted/50 p-0.5">
                    {(["trend", "average"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForecastMethod(m)}
                        className={cn(
                          "flex-1 rounded px-2 py-2 text-sm font-semibold capitalize",
                          forecastMethod === m
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <Button
          type="button"
          size="icon"
          onClick={() => setForecastSidebarOpen((o) => !o)}
          className={cn(
            "pointer-events-auto h-14 w-14 rounded-full shadow-lg",
            "border-2 border-primary-foreground/20",
            forecastSidebarOpen && "ring-2 ring-ring ring-offset-2 ring-offset-background"
          )}
          aria-expanded={forecastSidebarOpen}
          aria-controls="forecast-sidebar-panel"
          title={forecastSidebarOpen ? "Close forecast settings" : "Forecast settings"}
        >
          {forecastSidebarOpen ? (
            <X className="h-6 w-6" aria-hidden />
          ) : (
            <Settings2 className="h-6 w-6" aria-hidden />
          )}
          <span className="sr-only">
            {forecastSidebarOpen ? "Close forecast settings" : "Open forecast settings"}
          </span>
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Monitor system performance and key metrics</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <TabsList className="grid w-full grid-cols-2 min-[520px]:grid-cols-4 lg:w-auto lg:inline-flex lg:max-w-none">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requests">Request Analytics</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteer Analytics</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 w-full sm:w-auto sm:self-center"
              onClick={() => setAdminReportRangeOpen(true)}
            >
              <Download className="h-3.5 w-3.5" />
              Download report
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-0.5">
            Forecast uses last {forecastWindow} months · {forecastHorizon} month
            {forecastHorizon > 1 ? "s" : ""} ahead ·{" "}
            <span className="font-bold text-foreground uppercase">{forecastMethod}</span>
            {" · "}
            <span className="text-xs">
              Use the forecast button (bottom-right) to adjust.
            </span>
          </p>

          {/* ══════════════════════════════════════════════════════════════════
              OVERVIEW TAB — 3 sections
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-0">

            {/* Section 1 — Stat cards (5) with period selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-muted-foreground">Period summary</h2>
                <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
                  {(["weekly", "monthly", "yearly"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGlobalPeriod(p)}
                      className={periodToggleClass(globalPeriod === p)}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total requests */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-[#2F86A8]" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Total Requests</CardTitle>
                    <ClipboardList className="h-5 w-5 text-white/80 absolute top-4 right-4" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-white mb-1">{overviewStats.reqPeriod}</div>
                    <div className="flex items-center gap-1 text-sm text-white/90">
                      {overviewStats.reqChange != null &&
                        (overviewStats.reqChange >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 shrink-0" />
                        ))}
                      <span className="truncate">
                        {overviewStats.reqChange != null
                          ? `${overviewStats.reqChange > 0 ? "+" : ""}${overviewStats.reqChange}% vs prev`
                          : "All statuses"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Completions */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-[#2F86A8]" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Completions</CardTitle>
                    <Star className="h-5 w-5 text-white/80 absolute top-4 right-4" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-white mb-1">{overviewStats.compPeriod}</div>
                    <div className="flex items-center gap-1 text-sm text-white/90">
                      {overviewStats.compChange != null &&
                        (overviewStats.compChange >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 shrink-0" />
                        ))}
                      <span className="truncate">
                        {overviewStats.compChange != null
                          ? `${overviewStats.compChange > 0 ? "+" : ""}${overviewStats.compChange}% vs prev`
                          : "Guardian-confirmed"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cancellations */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-[#2F86A8]" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Cancellations</CardTitle>
                    <ClipboardList className="h-5 w-5 text-white/80 absolute top-4 right-4" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-white mb-1">
                      {overviewStats.cancelPeriod}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/90">
                      {overviewStats.cancelChange != null &&
                        (overviewStats.cancelChange > 0 ? (
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 shrink-0" />
                        ))}
                      <span className="truncate">
                        {overviewStats.cancelChange != null
                          ? `${overviewStats.cancelChange > 0 ? "+" : ""}${overviewStats.cancelChange}% vs prev`
                          : "In period"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Avg rating */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-[#2F86A8]" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Avg Rating</CardTitle>
                    <Star className="h-5 w-5 text-white/80 absolute top-4 right-4" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-white mb-1">
                      {overviewStats.avgRatingPeriod != null
                        ? overviewStats.avgRatingPeriod.toFixed(1)
                        : "—"}
                    </div>
                    <div className="text-sm text-white/90 truncate">
                      {overviewStats.ratingCount > 0
                        ? `${overviewStats.ratingCount} rating${overviewStats.ratingCount !== 1 ? "s" : ""} this period`
                        : "No ratings yet"}
                    </div>
                  </CardContent>
                </Card>

                {/* Fulfillment rate */}
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div
                    className={cn(
                      "absolute inset-0",
                      overviewStats.fulfillRate >= 70
                        ? "bg-emerald-600"
                        : overviewStats.fulfillRate >= 50
                          ? "bg-amber-500"
                          : "bg-rose-600"
                    )}
                  />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Fulfillment Rate</CardTitle>
                    <Users className="h-5 w-5 text-white/80 absolute top-4 right-4" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-white mb-1">
                      {overviewStats.fulfillRate}%
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/90">
                      {overviewStats.fulfillChange != null &&
                        (overviewStats.fulfillChange >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 shrink-0" />
                        ))}
                      <span className="truncate">of requests fulfilled</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 2 — What this means for you */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">What this means for you</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Signals based on the current period's data
                </p>
              </CardHeader>
              <CardContent>
                {signalSummaries.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-500/5 dark:border-emerald-500/20 p-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                      ✅ Everything looks on track — no issues to flag.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {signalSummaries.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20 p-4"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Volunteer pay — how pricing works (overview footer) */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                  <CardTitle className="text-lg">How volunteer pricing works</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Volunteers see the same rules on their home screen. Base rates are per service;
                  experience tier and demand can adjust the hourly rate before hours and fees are
                  applied.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">Associate</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">Base</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">0–4 services · any rating</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">Proficient</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        +5%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">5–19 services · avg ≥ 4.2</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">Advanced</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        +8%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">20–39 services · avg ≥ 4.4</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">Expert</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        +12%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">40+ services · avg ≥ 4.6</p>
                  </div>
                </div>
                <div className="rounded-xl border p-4 bg-muted/30">
                  <p className="text-sm font-medium mb-2">Demand-based modifier</p>
                  <div className="grid gap-1.5 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Normal</span>
                      <span className="font-medium tabular-nums">+0%</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">High (≥1.0 req / volunteer)</span>
                      <span className="font-medium tabular-nums">+3%</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Peak (≥1.5)</span>
                      <span className="font-medium tabular-nums">+6%</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Surge (≥2.0)</span>
                      <span className="font-medium tabular-nums">+10%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Demand uses competing requests versus available matching volunteers for the time
                    window. Tier and demand stack on the base hourly rate.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              REQUEST ANALYTICS TAB
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="requests" className="space-y-6 mt-0">

            {/* 1. Request volume forecast (narrative — answers the tab's question first) */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">Request volume forecast (next period)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  First-step forecast per service. Demand = requests that were not cancelled.
                </p>
              </CardHeader>
              <CardContent>
                {!requestVolumeForecastSummary.anyRow ? (
                  <p className="text-sm text-muted-foreground">
                    No service request history to forecast.
                  </p>
                ) : requestVolumeForecastSummary.allInsufficient ? (
                  <p className="text-sm text-muted-foreground">
                    Insufficient data to forecast (need at least 2 non-zero months per service in
                    the selected history window).
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border p-4 bg-muted/40">
                      <div className="text-xs text-muted-foreground mb-1">
                        Total predicted requests (next step, summed)
                      </div>
                      <div className="text-2xl font-bold">
                        ~{requestVolumeForecastSummary.totalNext}
                      </div>
                    </div>
                    {requestVolumeForecastSummary.top3.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Top 3 services</div>
                        <ul className="space-y-2">
                          {requestVolumeForecastSummary.top3.map((s) => (
                            <li key={s.name} className="flex justify-between text-sm">
                              <span>{s.name}</span>
                              <span className="text-muted-foreground">~{s.forecast}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Service breakdown (merged forecast + distribution) */}
            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Service breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Forecast + distribution by service type. Demand = requests that were not
                    cancelled.
                  </p>
                </div>
                <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
                  {(["weekly", "monthly", "yearly"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setServicePeriodFilter(period)}
                      className={periodToggleClass(servicePeriodFilter === period)}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top half: forecast per service with prediction range */}
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Forecast per service — next {forecastHorizon} month
                    {forecastHorizon > 1 ? "s" : ""}
                  </h4>
                  {serviceDemandForecast.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Insufficient data to forecast.</p>
                  ) : (
                    <div className="space-y-3">
                      {serviceDemandForecast.map((s) => {
                        const badge = s.badge;
                        return (
                          <div key={s.name} className="flex items-start justify-between text-sm">
                            <div>
                              <span className="font-medium">{s.name}</span>
                              <span
                                className={cn(
                                  "ml-2 text-xs px-1.5 py-0.5 rounded-full",
                                  badge.color === "green" &&
                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                                  badge.color === "yellow" &&
                                    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                                  badge.color === "red" &&
                                    "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                )}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-right">
                              {s.insufficient ? (
                                <span className="text-xs">Insufficient data</span>
                              ) : (
                                <>
                                  ~{s.forecast} expected{" "}
                                  {s.forecastLow !== s.forecastHigh && (
                                    <span className="text-xs">
                                      (likely {s.forecastLow}–{s.forecastHigh})
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  {/* Bottom half: distribution bars for current period */}
                  <h4 className="text-sm font-medium mb-3">
                    Distribution this period
                    {servicePeriodFilter === "weekly" && " · Last 7 days"}
                    {servicePeriodFilter === "monthly" && " · Last 30 days"}
                    {servicePeriodFilter === "yearly" && " · Last 12 months"}
                  </h4>
                  {topServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No service requests in the selected period.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topServices.map((service) => (
                        <div key={service.name} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-muted-foreground">{service.requests} requests</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className="bg-gradient-to-r from-primary to-primary-dark rounded-full h-2.5 transition-all"
                              style={{ width: `${service.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Pending in period (supporting detail) */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">Pending in period</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Supporting detail · Pending requests by creation month over the last{" "}
                  {forecastWindow} months
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                  <div className="rounded-xl border p-4 bg-orange-50/60 dark:bg-orange-500/10 min-w-[140px]">
                    <div className="text-xs text-muted-foreground mb-1">Pending in window</div>
                    <div className="text-2xl font-bold">{pendingByPeriod.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingByPeriod.total > 0 && totalRequests > 0
                        ? `${Math.round((pendingByPeriod.total / totalRequests) * 1000) / 10}% of all requests`
                        : "No pending in window"}
                    </p>
                  </div>
                  <div className="min-h-[200px] space-y-2">
                    <h4 className="text-sm font-medium">Pending by month</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={pendingByPeriod.chartData}
                        margin={{ top: 40, right: 10, left: 60, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{ value: "Month", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{
                            value: "Pending requests",
                            angle: -90,
                            position: "insideLeft",
                            dy: 60,
                          }}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelFormatter={(l) => `Month: ${l}`}
                          formatter={(v: number) => [v, "Pending requests"]}
                        />
                        <Bar
                          dataKey="pending"
                          fill="hsl(var(--primary))"
                          name="Pending requests"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly trend chart with local Completed/Requests toggle */}
            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Monthly trend</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {forecastHorizon}-month forecast · solid = actual, dashed = forecast
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex rounded-lg border bg-muted/50 p-0.5">
                    {(["completed", "requests"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMonthlyChartToggle(t)}
                        className={periodToggleClass(monthlyChartToggle === t)}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    This toggle only affects this chart
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const data =
                    monthlyChartToggle === "completed" ? monthlyTrend : monthlyRequestsTrend;
                  const yLabel =
                    monthlyChartToggle === "completed"
                      ? "Completed services"
                      : "Requests (non-cancelled)";
                  const hasForecast = data.some((r) => r.forecast != null);
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart
                          data={data}
                          margin={{ top: 40, right: 10, left: 60, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="month"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            label={{ value: "Month", position: "insideBottom", offset: -5 }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            label={{
                              value: yLabel,
                              angle: -90,
                              position: "insideLeft",
                              dy: 80,
                            }}
                          />
                          <Tooltip
                            content={(props) => (
                              <BandAwareTooltip
                                {...props}
                                labelPrefix="Month"
                              />
                            )}
                          />
                          {/* Prediction band */}
                          <Area
                            type="monotone"
                            name={FORECAST_BAND_AREA_NAME}
                            dataKey="fcBandLow"
                            stroke="none"
                            fill="transparent"
                            stackId="band"
                            dot={false}
                            activeDot={false}
                            legendType="none"
                            connectNulls={false}
                          />
                          <Area
                            type="monotone"
                            name={FORECAST_BAND_AREA_NAME}
                            dataKey="fcBandDiff"
                            stroke="none"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.15}
                            stackId="band"
                            dot={false}
                            activeDot={false}
                            legendType="none"
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="services"
                            name="Actual"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", r: 3 }}
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="forecast"
                            name="Forecast"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={{ fill: "hsl(var(--primary))", r: 2 }}
                            connectNulls
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="flex justify-end gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-4 border-b-2 border-primary" />
                          Actual
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-4 border-b-2 border-primary border-dashed" />
                          Forecast
                        </span>
                      </div>
                      {!hasForecast && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Insufficient data to extend forecast (need at least 2 months with
                          activity).
                        </p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              VOLUNTEER ANALYTICS TAB
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="volunteers" className="space-y-6 mt-0">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">Volunteer pool overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Whole roster of approved volunteers (not only the top 3). Ratings combine every
                  review across the pool.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border p-4 bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/80" />
                      Overall pool rating
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAnalytics.poolOverview.poolAvgRating != null
                        ? `${volunteerAnalytics.poolOverview.poolAvgRating.toFixed(2)}`
                        : "—"}
                      <span className="text-sm font-normal text-muted-foreground"> / 5.0</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {volunteerAnalytics.poolOverview.poolRatingCount > 0
                        ? `${volunteerAnalytics.poolOverview.poolRatingCount} review${volunteerAnalytics.poolOverview.poolRatingCount !== 1 ? "s" : ""} · ${volunteerAnalytics.poolOverview.volunteersWithRatings} volunteer${volunteerAnalytics.poolOverview.volunteersWithRatings !== 1 ? "s" : ""} rated`
                        : "No ratings in the pool yet"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Users className="h-3.5 w-3.5" />
                      Roster
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAnalytics.poolOverview.approvedTotal}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      approved volunteer{volunteerAnalytics.poolOverview.approvedTotal !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Active this period
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAnalytics.poolOverview.activeInPeriodCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      with ≥1 guardian-confirmed completion · last{" "}
                      {volunteerAnalytics.periodLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Avg load (active)
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAnalytics.poolOverview.avgCompletionsPerActiveInPeriod != null
                        ? volunteerAnalytics.poolOverview.avgCompletionsPerActiveInPeriod
                        : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      completions per active volunteer this period
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Lifetime completions (pool)
                    </div>
                    <div className="text-xl font-semibold tabular-nums">
                      {volunteerAnalytics.poolOverview.lifetimeCompletionsPool}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Guardian-confirmed, all approved volunteers
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Satisfaction trend (monthly)
                    </div>
                    {ratingQualityTrend.status === "building" ? (
                      <p className="text-sm text-muted-foreground">{ratingQualityTrend.label}</p>
                    ) : (
                      <>
                        <div className="text-xl font-semibold">{ratingQualityTrend.label}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          From recent monthly averages
                          {ratingQualityTrend.latestAvg != null &&
                            ` · latest ~${ratingQualityTrend.latestAvg}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {volunteerAnalytics.poolOverview.activeInPeriodButUnrated > 0 && (
                  <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3 bg-muted/20">
                    {volunteerAnalytics.poolOverview.activeInPeriodButUnrated === 1
                      ? "One active volunteer in this window has no ratings yet."
                      : `${volunteerAnalytics.poolOverview.activeInPeriodButUnrated} active volunteers in this window have no ratings yet.`}{" "}
                    The pool average only includes volunteers with at least one review.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Top Volunteers</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Dynamic analytics, trends &amp; forecasting by period
                  </p>
                </div>
                <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
                  {(["weekly", "monthly", "yearly"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setVolunteerPeriodFilter(period)}
                      className={periodToggleClass(volunteerPeriodFilter === period)}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Section 1 — Leaderboard cards (top 3, expandable) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {volunteerAnalytics.topVolunteers.slice(0, 3).map((volunteer, index) => (
                    <Card
                      key={volunteer.id}
                      className={`shadow-lg border-0 transition-all cursor-pointer hover:shadow-xl ${
                        expandedVolunteer === volunteer.id ? "lg:col-span-3" : ""
                      }`}
                      onClick={() =>
                        setExpandedVolunteer(
                          expandedVolunteer === volunteer.id ? null : volunteer.id
                        )
                      }
                    >
                      {expandedVolunteer === volunteer.id ? (
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="flex items-center justify-center">
                              <div className="h-64 w-64 rounded-full bg-muted grid place-items-center">
                                <UserIcon className="h-24 w-24 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-2xl font-bold">{volunteer.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {volunteer.reviews} reviews
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-yellow-500" />
                                    <span className="text-sm font-medium">{volunteer.badge}</span>
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Specialties: {volunteer.specialty}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-muted/50 border-0">
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-1">About me</div>
                                    <p className="text-sm">{volunteer.about}</p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-muted/50 border-0">
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-1">Education</div>
                                    <p className="text-sm font-medium mb-2">{volunteer.education}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Working with expertise in {volunteer.specialty.toLowerCase()}
                                    </p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-muted/50 border-0">
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-1">Care Method</div>
                                    <p className="text-sm">{volunteer.method}</p>
                                  </CardContent>
                                </Card>
                                <Card className="bg-muted/50 border-0">
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-1">Performance</div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-medium">
                                          {volunteer.rating != null
                                            ? volunteer.rating.toFixed(1)
                                            : "—"}{" "}
                                          / 5.0
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          ({volunteer.reviews} reviews)
                                        </span>
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {volunteer.services} total · {volunteer.servicesPeriod} this
                                        period
                                      </div>
                                      {volunteer.contribution > 0 && (
                                        <div className="text-xs text-primary mt-1">
                                          {volunteer.contribution}% of period completions
                                        </div>
                                      )}
                                      {volunteer.growth !== 0 && (
                                        <div
                                          className={cn(
                                            "text-xs mt-1",
                                            volunteer.growth > 0
                                              ? "text-green-600"
                                              : "text-rose-600"
                                          )}
                                        >
                                          {volunteer.growth > 0 ? "↑" : "↓"}{" "}
                                          {Math.abs(volunteer.growth)}% vs prev period
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <CardContent className="p-0">
                          <div className="flex items-center gap-4 p-4">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full bg-muted grid place-items-center">
                                <UserIcon className="h-7 w-7 text-muted-foreground" />
                              </div>
                              {index === 0 && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                  <Award className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold truncate">{volunteer.name}</p>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {volunteer.badge}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {volunteer.specialty}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="font-medium">
                                    {volunteer.rating != null ? volunteer.rating.toFixed(1) : "—"}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {volunteer.servicesPeriod} this period
                                </span>
                                {volunteer.contribution > 0 && (
                                  <span className="text-primary">
                                    {volunteer.contribution}% share
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              className={`h-5 w-5 text-muted-foreground transition-transform ${
                                expandedVolunteer === volunteer.id ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                  {volunteerAnalytics.topVolunteers.length === 0 && (
                    <div className="lg:col-span-3 rounded-xl border p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No volunteer activity in the selected period.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 2 — Period stats tiles */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Completed in period</div>
                    <div className="text-2xl font-bold">{volunteerAnalytics.totalInPeriod}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last {volunteerAnalytics.periodLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Top performers</div>
                    <div className="text-2xl font-bold">
                      {volunteerAnalytics.topVolunteers.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">with activity in period</p>
                  </div>
                  <div className="rounded-xl border p-4 bg-primary/10 border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">Top 3 share</div>
                    <div className="text-2xl font-bold">
                      {volunteerAnalytics.totalInPeriod > 0
                        ? `${Math.round(
                            (volunteerAnalytics.topVolunteers
                              .slice(0, 3)
                              .reduce((s, v) => s + v.servicesPeriod, 0) /
                              volunteerAnalytics.totalInPeriod) *
                              100
                          )}%`
                        : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">of period completions</p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Forecast (next period)</div>
                    <div className="text-2xl font-bold">
                      {volunteerAnalytics.topThreeForecastInsufficient
                        ? "—"
                        : volunteerAnalytics.topThreeForecastSum}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      est. services from top 3
                    </p>
                  </div>
                </div>

                {/* Section 3 — Insights */}
                {volunteerAnalytics.topVolunteers.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Insights
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {volunteerAnalytics.totalInPeriod > 0 && (
                        <li>
                          • Top 3 volunteers completed{" "}
                          <span className="font-medium text-foreground">
                            {Math.round(
                              (volunteerAnalytics.topVolunteers
                                .slice(0, 3)
                                .reduce((s, v) => s + v.servicesPeriod, 0) /
                                volunteerAnalytics.totalInPeriod) *
                                100
                            )}
                            %
                          </span>{" "}
                          of all services in the last {volunteerAnalytics.periodLabel}.
                        </li>
                      )}
                      {!volunteerAnalytics.topThreeForecastInsufficient &&
                        volunteerAnalytics.topVolunteers.length > 0 && (
                          <li>
                            • Based on recent activity, top 3 are forecast to complete ~
                            <span className="font-medium text-foreground">
                              {volunteerAnalytics.topThreeForecastSum}
                            </span>{" "}
                            services in the next period.
                          </li>
                        )}
                      {volunteerAnalytics.topVolunteers.some((v) => v.growth > 0) && (
                        <li>
                          •{" "}
                          {volunteerAnalytics.topVolunteers.filter((v) => v.growth > 0).length}{" "}
                          volunteer(s) showing growth vs previous period.
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Section 4 — Top 3 trend chart with prediction bands */}
                {volunteerAnalytics.trendChartData.length > 0 && (
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-1">
                      {volunteerAnalytics.chartTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Solid = actual · dashed = forecast · shaded band = prediction range
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart
                        data={volunteerAnalytics.trendChartData}
                        margin={{ top: 40, right: 10, left: 60, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{
                            value: volunteerAnalytics.chartXLabel,
                            position: "insideBottom",
                            offset: -5,
                          }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{
                            value: "Services completed",
                            angle: -90,
                            position: "insideLeft",
                            dy: 80,
                          }}
                        />
                        <Tooltip
                          content={(props) => (
                            <BandAwareTooltip
                              {...props}
                              labelPrefix={volunteerAnalytics.chartXLabel}
                            />
                          )}
                        />
                        {/* Prediction bands per volunteer */}
                        {volunteerAnalytics.topVolunteers.slice(0, 3).map((v, i) => (
                          <>
                            <Area
                              key={`${v.id}-bl`}
                              type="monotone"
                              name={FORECAST_BAND_AREA_NAME}
                              dataKey={`v_${v.id}_bandLow`}
                              stroke="none"
                              fill="transparent"
                              stackId={`band_${v.id}`}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              connectNulls={false}
                            />
                            <Area
                              key={`${v.id}-bd`}
                              type="monotone"
                              name={FORECAST_BAND_AREA_NAME}
                              dataKey={`v_${v.id}_bandDiff`}
                              stroke="none"
                              fill={volunteerColors[i]}
                              fillOpacity={0.15}
                              stackId={`band_${v.id}`}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              connectNulls={false}
                            />
                          </>
                        ))}
                        {/* Actual lines */}
                        {volunteerAnalytics.topVolunteers.slice(0, 3).map((v, i) => (
                          <Line
                            key={v.id}
                            type="monotone"
                            dataKey={`v_${v.id}`}
                            stroke={volunteerColors[i]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name={v.name}
                            connectNulls={false}
                          />
                        ))}
                        {/* Forecast lines */}
                        {volunteerAnalytics.topVolunteers.slice(0, 3).map((v, i) => (
                          <Line
                            key={`${v.id}-fc`}
                            type="monotone"
                            dataKey={`v_${v.id}_fc`}
                            stroke={volunteerColors[i]}
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={{ r: 2 }}
                            name={`${v.name} (forecast)`}
                            connectNulls
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Section 5 — Rating trend */}
                <div className="rounded-xl border p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Rating trend</h4>
                    {ratingQualityTrend.status !== "building" && (
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                          ratingQualityTrend.status === "improving" &&
                            "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
                          ratingQualityTrend.status === "declining" &&
                            "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400",
                          ratingQualityTrend.status === "stable" &&
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {ratingQualityTrend.status === "improving" && (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {ratingQualityTrend.status === "declining" && (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {ratingQualityTrend.status === "stable" && (
                          <Minus className="h-3 w-3" />
                        )}
                        {ratingQualityTrend.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Based on all guardian-confirmed service ratings in the period
                  </p>
                  {ratingQualityTrend.status === "building" ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {ratingQualityTrend.label}
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={ratingQualityTrend.chartData}
                        margin={{ top: 10, right: 10, left: 50, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <YAxis
                          domain={[3, 5]}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{
                            value: "Avg rating",
                            angle: -90,
                            position: "insideLeft",
                            dy: 40,
                          }}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(v: number) => [v?.toFixed(2), "Avg rating"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="avg"
                          stroke={
                            ratingQualityTrend.status === "improving"
                              ? "hsl(142 71% 45%)"
                              : ratingQualityTrend.status === "declining"
                                ? "hsl(var(--destructive))"
                                : "hsl(var(--primary))"
                          }
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              OPERATIONS TAB
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="operations" className="space-y-6 mt-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">
                Reporting period (cancellations + volunteer acceptance)
              </span>
              <div className="flex shrink-0 rounded-lg border bg-background p-0.5">
                {(["weekly", "monthly", "yearly"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setCancelPeriodFilter(period)}
                    className={periodToggleClass(cancelPeriodFilter === period)}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cancellations Data Analytics */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">Cancellations Data Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Guardian-initiated cancellations with insights and trends
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metrics grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4 bg-red-50/60 dark:bg-red-500/10">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Cancelled in period
                    </div>
                    <div className="text-2xl font-bold">{cancellationAnalytics.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cancellationAnalytics.totalInPeriod} total requests in range
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-amber-50/60 dark:bg-amber-500/10">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Cancellation rate
                    </div>
                    <div className="text-2xl font-bold">{cancellationAnalytics.rate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">of requests cancelled</p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Total (all time)
                    </div>
                    <div className="text-2xl font-bold">{cancelledRequests}</div>
                    <p className="text-xs text-muted-foreground mt-1">cumulative cancellations</p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Top reason</div>
                    <div className="text-lg font-bold truncate">
                      {cancellationAnalytics.topReason
                        ? `${cancellationAnalytics.topReason.name} (${cancellationAnalytics.topReason.percentage}%)`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Reasons breakdown */}
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-4">Cancellation reasons</h4>
                    {cancellationAnalytics.reasonData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No cancellations in this period.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cancellationAnalytics.reasonData.map((r) => (
                          <div key={r.name} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{r.name}</span>
                              <span className="text-muted-foreground">
                                {r.value} ({r.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-red-500/70 rounded-full h-2 transition-all"
                                style={{ width: `${r.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Monthly trend + forecast with prediction band */}
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-1">Cancellations over time</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Last {forecastWindow} months of actuals
                      {cancellationAnalytics.cancellationForecastInsufficient
                        ? ""
                        : " · dashed = forecast · shaded = prediction range"}
                      .
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart
                        data={cancellationAnalytics.chartData}
                        margin={{ top: 16, right: 10, left: 60, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{ value: "Month", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          label={{
                            value: "Cancellations",
                            angle: -90,
                            position: "insideLeft",
                            dy: 50,
                          }}
                        />
                        <Tooltip
                          content={(props) => (
                            <BandAwareTooltip {...props} labelPrefix="Month" />
                          )}
                        />
                        {/* Prediction band */}
                        <Area
                          type="monotone"
                          name={FORECAST_BAND_AREA_NAME}
                          dataKey="fcBandLow"
                          stroke="none"
                          fill="transparent"
                          stackId="band"
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          connectNulls={false}
                        />
                        <Area
                          type="monotone"
                          name={FORECAST_BAND_AREA_NAME}
                          dataKey="fcBandDiff"
                          stroke="none"
                          fill="hsl(var(--destructive))"
                          fillOpacity={0.15}
                          stackId="band"
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          connectNulls={false}
                        />
                        <Bar
                          dataKey="cancelled"
                          name="Actual"
                          fill="hsl(var(--destructive))"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="cancelledFc"
                          name="Forecast"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {cancellationAnalytics.cancellationForecastInsufficient && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Insufficient data to extend forecast (need at least 2 months with
                        cancellations in this window).
                      </p>
                    )}
                    {!cancellationAnalytics.cancellationForecastInsufficient && (
                      <div className="flex justify-end gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm bg-[hsl(var(--destructive))]" />
                          Actual
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-4 border-b-2 border-[hsl(var(--destructive))] border-dashed" />
                          Forecast
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg">Volunteer acceptance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  After admin assigns a volunteer or a guardian names a preferred volunteer, the
                  volunteer can accept or decline. Uses the reporting period above.
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  <span className="font-medium text-foreground">Accepts</span> count when an offer is
                  confirmed on the assignment. <span className="font-medium text-foreground">Declines</span>{" "}
                  include admin-assigned slots declined on the assignment and preferred-volunteer
                  declines stored on the request. <span className="font-medium text-foreground">Rate</span>{" "}
                  is accepts divided by all decisions in the period.{" "}
                  <span className="font-medium text-foreground">Awaiting</span> is assigned but not yet
                  accepted.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4 bg-blue-50/50 dark:bg-blue-500/5">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Acceptance rate
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAcceptanceAnalytics.acceptanceRatePct != null
                        ? `${volunteerAcceptanceAnalytics.acceptanceRatePct}%`
                        : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {volunteerAcceptanceAnalytics.decided > 0
                        ? `${volunteerAcceptanceAnalytics.accepts} accept${volunteerAcceptanceAnalytics.accepts !== 1 ? "s" : ""} · ${volunteerAcceptanceAnalytics.declines} decline${volunteerAcceptanceAnalytics.declines !== 1 ? "s" : ""}`
                        : "No accept or decline decisions in this window"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Accepts</div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAcceptanceAnalytics.accepts}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      offers confirmed in this period
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Declines</div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAcceptanceAnalytics.declines}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {volunteerAcceptanceAnalytics.declinesFromAssignment} admin-assigned ·{" "}
                      {volunteerAcceptanceAnalytics.declinesPreferred} preferred
                    </p>
                  </div>
                  <div className="rounded-xl border p-4 bg-muted/40">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Awaiting response
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {volunteerAcceptanceAnalytics.pendingOffers}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      assigned, not accepted yet
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {cancellationAnalytics.insights.length + volunteerAcceptanceAnalytics.insights.length >
              0 && (
              <Card className="shadow-lg border-0 border-amber-200/50 dark:border-amber-500/25 bg-amber-50/40 dark:bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    Operations insights
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    From cancellations and volunteer acceptance in the selected period
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {cancellationAnalytics.insights.map((insight, i) => (
                      <li key={`c-${i}`} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                    {volunteerAcceptanceAnalytics.insights.map((insight, i) => (
                      <li key={`v-${i}`} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
