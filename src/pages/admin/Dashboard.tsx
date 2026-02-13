import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Star, Award, ChevronRight, ArrowUpRight, ArrowDownRight, User as UserIcon, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type ServicePeriodFilter = "weekly" | "monthly" | "yearly";
type PendingRangeFilter = "from_2025" | "2025" | "2026";

const Dashboard = () => {
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);
  const [servicePeriodFilter, setServicePeriodFilter] = useState<ServicePeriodFilter>("monthly");
  const [pendingRangeFilter, setPendingRangeFilter] = useState<PendingRangeFilter>("from_2025");
  const [cancelPeriodFilter, setCancelPeriodFilter] = useState<ServicePeriodFilter>("monthly");
  const [volunteerPeriodFilter, setVolunteerPeriodFilter] = useState<ServicePeriodFilter>("monthly");

  // Live collections
  const [requests, setRequests] = useState<any[] | null>(null);
  const [approvedVolunteers, setApprovedVolunteers] = useState<any[] | null>(null);
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { sum: number; count: number }>>({});
  const [avgElderMs, setAvgElderMs] = useState<number | null>(null);
  const [avgVolunteerMs, setAvgVolunteerMs] = useState<number | null>(null);

  // Subscribe to Firestore
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
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const email = (r.volunteerEmail || "").toLowerCase();
        const val = Number(r.rating) || 0;
        if (!email || val <= 0) return;
        if (!map[email]) map[email] = { sum: 0, count: 0 };
        map[email].sum += val;
        map[email].count += 1;
      });
      setRatingsMap(map);
    });
    return () => unsub();
  }, []);

  // Form metrics averages
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "formMetrics"), (snap) => {
      let elderSum = 0, elderCount = 0;
      let volunteerSum = 0, volunteerCount = 0;
      snap.docs.forEach((d) => {
        const m = d.data() as any;
        const dur = Number(m.durationMs) || 0;
        if (m.type === "elder_request_service") { elderSum += dur; elderCount += 1; }
        if (m.type === "volunteer_application") { volunteerSum += dur; volunteerCount += 1; }
      });
      setAvgElderMs(elderCount ? elderSum / elderCount : null);
      setAvgVolunteerMs(volunteerCount ? volunteerSum / volunteerCount : null);
    });
    return () => unsub();
  }, []);

  const formatDuration = (ms: number | null) => {
    if (ms == null) return "—";
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Derived metrics
  const totalRequests = requests?.length ?? 0;
  const pendingRequests = (requests || []).filter((r) => (r.status || "pending") === "pending").length;
  const activeVolunteers = approvedVolunteers?.length ?? 0;
  const cancelledRequests = (requests || []).filter((r) => r.status === "cancelled").length;
  const cancelReasons = useMemo(() => {
    const map: Record<string, number> = {};
    (requests || []).forEach((r) => {
      if (r.status !== "cancelled") return;
      const code = r.cancelReasonCode || "other";
      map[code] = (map[code] || 0) + 1;
    });
    return map;
  }, [requests]);

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

  const REASON_LABELS: Record<string, string> = {
    schedule_change: "Schedule changed",
    price_high: "Price too high",
    preferred_unavailable: "Preferred volunteer unavailable",
    entered_wrong_info: "Entered wrong information",
    other: "Other",
  };

  const cancellationAnalytics = useMemo(() => {
    const nowMs = Date.now();
    const periodMs =
      cancelPeriodFilter === "weekly"
        ? 7 * 24 * 60 * 60 * 1000
        : cancelPeriodFilter === "monthly"
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
    const cutoffMs = nowMs - periodMs;

    const cancelledInPeriod = (requests || []).filter((r) => {
      if (r.status !== "cancelled") return false;
      return getCancelledMs(r) >= cutoffMs;
    });
    const totalInPeriod = (requests || []).filter((r) => getRequestCreatedMs(r) >= cutoffMs).length;
    const rate = totalInPeriod > 0 ? Math.round((cancelledInPeriod.length / totalInPeriod) * 1000) / 10 : 0;
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
        percentage: totalCancelled > 0 ? Math.round((count / totalCancelled) * 1000) / 10 : 0,
      }));

    const months: { month: string; cancelled: number; key: string }[] = [];
    const cur = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), cancelled: 0, key });
    }
    cancelledInPeriod.forEach((r) => {
      const ms = getCancelledMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].cancelled += 1;
    });

    const topReason = reasonData[0];
    const insights: string[] = [];
    if (rate > 15) insights.push(`Cancellation rate is above 15% — consider reviewing scheduling or pricing flow.`);
    if (topReason && topReason.name === "Schedule changed") insights.push(`"Schedule changed" is the top reason — flexible rescheduling options may help.`);
    if (topReason && topReason.name === "Preferred volunteer unavailable") insights.push(`Preferred volunteer availability gaps — consider broadening recommendations.`);
    if (topReason && topReason.name === "Price too high") insights.push(`Price sensitivity noted — dynamic pricing or discounts could improve conversion.`);
    if (topReason && topReason.name === "Entered wrong information") insights.push(`Data entry errors — consider simplifying the form or adding validation.`);
    if (totalCancelled === 0 && totalInPeriod > 0) insights.push(`No cancellations in this period — retention looks strong.`);
    if (totalCancelled > 0 && insights.length === 0) insights.push(`Review cancellation patterns to identify improvement opportunities.`);

    return {
      total: cancelledInPeriod.length,
      rate,
      totalInPeriod,
      reasonData,
      chartData: months.map(({ month, cancelled }) => ({ month, cancelled })),
      topReason,
      insights,
    };
  }, [requests, cancelPeriodFilter]);

  const now = new Date();
  const weekAgoMs = now.getTime() - 6 * 24 * 60 * 60 * 1000;
  const isCompletedConfirmed = (a: any) => a.status === "completed" && a.guardianConfirmed === true;
  const getDateMs = (a: any) => {
    const ms = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
    return ms || 0;
  };
  const completedThisWeek = (assignments || []).filter((a) => isCompletedConfirmed(a) && getDateMs(a) >= weekAgoMs).length;

  const pendingPercentage = totalRequests > 0 ? Math.round((pendingRequests / totalRequests) * 1000) / 10 : 0;

  const stats = [
    { title: "Total Service Requests", value: String(totalRequests), icon: ClipboardList, change: "", trend: "up", bg: "bg-[#2F86A8]", subtitle: "live" },
    { title: "Active Volunteers", value: String(activeVolunteers), icon: Users, change: "", trend: "up", bg: "bg-[#2F86A8]", subtitle: "approved" },
    { title: "Completed This Week", value: String(completedThisWeek), icon: Star, change: "", trend: "up", bg: "bg-[#2F86A8]", subtitle: "confirmed" },
    { title: "Pending Requests", value: String(pendingRequests), icon: ClipboardList, change: `${pendingPercentage}%`, trend: "up", bg: "bg-[#2F86A8]", subtitle: "of total • awaiting assignment" },
  ];

  // Weekly activity (last 7 days)
  const weekdayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;
  const weeklyData = useMemo(() => {
    const base = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return { day: weekdayShort[d.getDay()], key: d.toDateString(), requests: 0 };
    });
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms || ms < weekAgoMs) return;
      const ds = new Date(ms).toDateString();
      const idx = base.findIndex((b) => b.key === ds);
      if (idx >= 0) base[idx].requests += 1;
    });
    return base.map(({ day, requests }) => ({ day, requests }));
  }, [assignments]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; services: number; key: string }[] = [];
    const cur = new Date(now);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      months.push({ month: label, services: 0, key });
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
    return months.map(({ month, services }) => ({ month, services }));
  }, [assignments]);

  // Top Volunteers – dynamic analytics with period filter, trends, and forecast
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

  const volunteerAnalytics = useMemo(() => {
    const nowMs = Date.now();
    const periodMs =
      volunteerPeriodFilter === "weekly"
        ? 7 * 24 * 60 * 60 * 1000
        : volunteerPeriodFilter === "monthly"
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
    const cutoffMs = nowMs - periodMs;
    const prevCutoffMs = nowMs - periodMs * 2;

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

    const list = (approvedVolunteers || []).map((v) => {
      const emailKey = (v.email || "").toLowerCase();
      const r = ratingsMap[emailKey];
      const avg = r ? r.sum / r.count : null;
      const countAll = tasksMap[emailKey] || 0;
      const countPeriod = tasksInPeriod[emailKey] || 0;
      const countPrev = tasksPrevPeriod[emailKey] || 0;
      const growth = countPrev > 0 ? Math.round(((countPeriod - countPrev) / countPrev) * 100) : countPeriod > 0 ? 100 : 0;
      const contribution = totalInPeriod > 0 ? Math.round((countPeriod / totalInPeriod) * 1000) / 10 : 0;
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
        specialty: Array.isArray(v.services) ? v.services.slice(0, 2).join(" & ") : (v.services || "Care Services"),
        badge: avg && avg >= 4.8 ? "Top Performer" : avg && avg >= 4.5 ? "Rising Star" : "Volunteer",
        about: v.bio || "Reliable and compassionate volunteer.",
        education: v.education || "",
        method: v.method || "Client-centered care",
      };
    })
      .filter((v) => v.servicesPeriod > 0 || v.services > 0)
      .sort((a, b) => b.servicesPeriod - a.servicesPeriod || ((b.rating ?? 0) - (a.rating ?? 0)) || b.services - a.services);

    const topVolunteers = list.slice(0, 5);

    const months: { month: string; key: string }[] = [];
    const cur = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      months.push({ month: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), key: `${d.getFullYear()}-${d.getMonth()}` });
    }

    const monthlyByEmail: Record<string, number[]> = {};
    topVolunteers.forEach((v) => { monthlyByEmail[v.emailKey] = months.map(() => 0); });
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const email = (a.volunteerEmail || "").toLowerCase();
      if (!monthlyByEmail[email]) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) monthlyByEmail[email][idx] += 1;
    });

    const trendChartData = months.map((m, idx) => {
      const row: Record<string, string | number> = { month: m.month };
      topVolunteers.slice(0, 3).forEach((v) => {
        row[`v_${v.id}`] = monthlyByEmail[v.emailKey]?.[idx] ?? 0;
      });
      return row;
    });

    const avgPerMonth = topVolunteers.map((v) => {
      const hist = monthlyByEmail[v.emailKey] || [];
      const sum = hist.reduce((a, b) => a + b, 0);
      const monthsActive = hist.filter((x) => x > 0).length || 1;
      return { ...v, avgMonthly: Math.round((sum / Math.max(monthsActive, 3)) * 10) / 10, forecast: Math.round((sum / Math.max(monthsActive, 3)) * 10) / 10 };
    });

    return {
      topVolunteers,
      totalInPeriod,
      trendChartData,
      avgPerMonth,
      periodLabel: volunteerPeriodFilter === "weekly" ? "7 days" : volunteerPeriodFilter === "monthly" ? "30 days" : "12 months",
    };
  }, [approvedVolunteers, ratingsMap, tasksMap, assignments, volunteerPeriodFilter]);

  // Normalize service names to canonical ids and labels
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

  // Range Pending: pending requests from 2025 to recent, with filters
  const rangePendingData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    if (pendingRangeFilter === "from_2025") {
      startDate = new Date(2025, 0, 1);
      endDate = new Date(now);
    } else if (pendingRangeFilter === "2025") {
      startDate = new Date(2025, 0, 1);
      endDate = new Date(2025, 11, 31, 23, 59, 59);
    } else {
      // 2026
      startDate = new Date(2026, 0, 1);
      endDate = new Date(now);
    }
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const pendingInRange = (requests || []).filter((r) => {
      if ((r.status || "pending") !== "pending") return false;
      const ms = getRequestCreatedMs(r);
      return ms >= startMs && ms <= endMs;
    });

    const months: { month: string; pending: number; key: string }[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}`;
      months.push({ month: cur.toLocaleString(undefined, { month: "short", year: "2-digit" }), pending: 0, key });
      cur.setMonth(cur.getMonth() + 1);
    }

    pendingInRange.forEach((r) => {
      const ms = getRequestCreatedMs(r);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].pending += 1;
    });

    return { total: pendingInRange.length, chartData: months.map(({ month, pending }) => ({ month, pending })) };
  }, [requests, pendingRangeFilter]);

  // Most requested services (live from serviceRequests, filtered by period)
  const topServices = useMemo(() => {
    const nowMs = Date.now();
    const periodMs =
      servicePeriodFilter === "weekly"
        ? 7 * 24 * 60 * 60 * 1000
        : servicePeriodFilter === "monthly"
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
    const cutoffMs = nowMs - periodMs;

    const counts: Record<string, number> = {};
    (requests || []).forEach((r) => {
      const createdMs = getRequestCreatedMs(r);
      if (createdMs < cutoffMs) return; // exclude requests outside selected period
      const arr: string[] = Array.isArray(r.services) ? r.services : (r.service ? [r.service] : []);
      arr.forEach((s) => {
        const id = toServiceId(s);
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, [, n]) => acc + n, 0) || 1;
    return entries.map(([id, n]) => ({ name: toDisplayName(id), requests: n, percentage: Math.round((n / total) * 1000) / 10 }));
  }, [requests, servicePeriodFilter]);


  

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard Overview</h1>
            <p className="text-muted-foreground">Monitor system performance and key metrics</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 px-3 py-1.5 rounded-full shrink-0">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live from Firestore
          </span>
        </div>

        {/* Stats Grid - always visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-lg">
              <div className={`absolute inset-0 ${stat.bg}`} />
              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-white/90">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-sm text-white/90">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{stat.change}</span>
                  <span className="text-white/70">{stat.subtitle}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">Request Analytics</TabsTrigger>
            <TabsTrigger value="volunteers">Volunteer Analytics</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity</CardTitle>
              <p className="text-sm text-muted-foreground">Completed services this week</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Total services completed</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="services" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Form Completion Time</CardTitle>
            <p className="text-sm text-muted-foreground">Average time to complete forms</p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-1">Guardians / Elders</div>
                <div className="text-2xl font-bold">{formatDuration(avgElderMs)}</div>
              </div>
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-1">Volunteers</div>
                <div className="text-2xl font-bold">{formatDuration(avgVolunteerMs)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6 mt-0">
        {/* Range Pending */}
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Range Pending</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pending requests by creation date from 2025 to recent
              </p>
            </div>
            <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
              {[
                { value: "from_2025" as const, label: "From 2025" },
                { value: "2025" as const, label: "2025" },
                { value: "2026" as const, label: "2026" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPendingRangeFilter(value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    pendingRangeFilter === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <div className="rounded-xl border p-4 bg-orange-50/60 dark:bg-orange-500/10 min-w-[140px]">
                <div className="text-xs text-muted-foreground mb-1">Pending in range</div>
                <div className="text-2xl font-bold">{rangePendingData.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {rangePendingData.total > 0 && totalRequests > 0
                    ? `${Math.round((rangePendingData.total / totalRequests) * 1000) / 10}% of all requests`
                    : "No pending in range"}
                </p>
              </div>
              <div className="min-h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rangePendingData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="pending" fill="hsl(var(--primary))" name="Pending" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Requested Services */}
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Most Requested Services</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribution of service types
                {servicePeriodFilter === "weekly" && " • Last 7 days"}
                {servicePeriodFilter === "monthly" && " • Last 30 days"}
                {servicePeriodFilter === "yearly" && " • Last 12 months"}
              </p>
            </div>
            <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
              {(["weekly", "monthly", "yearly"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setServicePeriodFilter(period)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    servicePeriodFilter === period
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No service requests in the selected period.
              </p>
            ) : (
            topServices.map((service) => (
              <div key={service.name} className="space-y-2">
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
            ))
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="volunteers" className="space-y-6 mt-0">
        {/* Top Volunteers – Dynamic / Forecasting Data Analytics */}
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Top Volunteers</CardTitle>
              <p className="text-sm text-muted-foreground">Dynamic analytics, trends & forecasting by period</p>
            </div>
            <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
              {(["weekly", "monthly", "yearly"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setVolunteerPeriodFilter(period)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    volunteerPeriodFilter === period
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-1">Completed in period</div>
                <div className="text-2xl font-bold">{volunteerAnalytics.totalInPeriod}</div>
                <p className="text-xs text-muted-foreground mt-1">Last {volunteerAnalytics.periodLabel}</p>
              </div>
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-1">Top performers</div>
                <div className="text-2xl font-bold">{volunteerAnalytics.topVolunteers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">with activity in period</p>
              </div>
              <div className="rounded-xl border p-4 bg-primary/10 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">Top 3 share</div>
                <div className="text-2xl font-bold">
                  {volunteerAnalytics.totalInPeriod > 0
                    ? `${Math.round(
                        (volunteerAnalytics.topVolunteers.slice(0, 3).reduce((s, v) => s + v.servicesPeriod, 0) / volunteerAnalytics.totalInPeriod) * 100
                      )}%`
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">of period completions</p>
              </div>
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-1">Forecast (next period)</div>
                <div className="text-2xl font-bold">
                  {volunteerAnalytics.avgPerMonth.length > 0
                    ? Math.round(volunteerAnalytics.avgPerMonth.slice(0, 3).reduce((s, v) => s + v.forecast, 0))
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">est. services from top 3</p>
              </div>
            </div>

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
                            .reduce((s, v) => s + v.servicesPeriod, 0) / volunteerAnalytics.totalInPeriod) *
                            100
                        )}
                        %
                      </span>{" "}
                      of all services in the last {volunteerAnalytics.periodLabel}.
                    </li>
                  )}
                  {volunteerAnalytics.avgPerMonth.length > 0 && (
                    <li>
                      • Based on recent activity, top 3 are forecast to complete ~
                      <span className="font-medium text-foreground">
                        {Math.round(volunteerAnalytics.avgPerMonth.slice(0, 3).reduce((s, v) => s + v.forecast, 0))}
                      </span>{" "}
                      services in the next period.
                    </li>
                  )}
                  {volunteerAnalytics.topVolunteers.some((v) => v.growth > 0) && (
                    <li>
                      • {volunteerAnalytics.topVolunteers.filter((v) => v.growth > 0).length} volunteer(s) showing growth
                      vs previous period.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {volunteerAnalytics.trendChartData.length > 0 && (
              <div className="rounded-xl border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-4">Top 3 volunteers – services per month (last 6 months)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={volunteerAnalytics.trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    {volunteerAnalytics.topVolunteers.slice(0, 3).map((v, i) => {
                      const colors = ["hsl(var(--primary))", "hsl(var(--primary-dark))", "hsl(198 63% 69%)"];
                      return (
                        <Line
                          key={v.id}
                          type="monotone"
                          dataKey={`v_${v.id}`}
                          stroke={colors[i]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={v.name}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {volunteerAnalytics.topVolunteers.slice(0, 3).map((volunteer, index) => (
              <Card 
                key={volunteer.id} 
                className={`shadow-lg border-0 transition-all cursor-pointer hover:shadow-xl ${
                  expandedVolunteer === volunteer.id ? "lg:col-span-3" : ""
                }`}
                onClick={() => setExpandedVolunteer(expandedVolunteer === volunteer.id ? null : volunteer.id)}
              >
                {expandedVolunteer === volunteer.id ? (
                  // Expanded View
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Profile Icon */}
                      <div className="space-y-2 flex items-center justify-center">
                        <div className="h-64 w-64 rounded-full bg-muted grid place-items-center">
                          <UserIcon className="h-24 w-24 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-2xl font-bold">{volunteer.name}</h3>
                              <p className="text-sm text-muted-foreground">{volunteer.reviews} reviews</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-yellow-500" />
                              <span className="text-sm font-medium">{volunteer.badge}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">Specialties: {volunteer.specialty}</div>
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
                              <p className="text-xs text-muted-foreground">Working with expertise in {volunteer.specialty.toLowerCase()}</p>
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
                                  <span className="text-sm font-medium">{volunteer.rating != null ? volunteer.rating.toFixed(1) : "—"} / 5.0</span>
                                  <span className="text-xs text-muted-foreground">({volunteer.reviews} reviews)</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{volunteer.services} total • {volunteer.servicesPeriod} this period</div>
                                {volunteer.contribution > 0 && (
                                  <div className="text-xs text-primary mt-1">{volunteer.contribution}% of period completions</div>
                                )}
                                {volunteer.growth !== 0 && (
                                  <div className={cn("text-xs mt-1", volunteer.growth > 0 ? "text-green-600" : "text-rose-600")}>
                                    {volunteer.growth > 0 ? "↑" : "↓"} {Math.abs(volunteer.growth)}% vs prev period
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
                  // Collapsed View
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
                        <p className="text-sm text-muted-foreground truncate">{volunteer.specialty}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{volunteer.rating != null ? volunteer.rating.toFixed(1) : "—"}</span>
                          </div>
                          <span className="text-muted-foreground">{volunteer.servicesPeriod} this period</span>
                          {volunteer.contribution > 0 && <span className="text-primary">{volunteer.contribution}% share</span>}
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedVolunteer === volunteer.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6 mt-0">
        {/* Cancellations Data Analytics */}
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Cancellations Data Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">Guardian-initiated cancellations with insights and trends</p>
            </div>
            <div className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5">
              {(["weekly", "monthly", "yearly"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setCancelPeriodFilter(period)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    cancelPeriodFilter === period
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metrics grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4 bg-red-50/60 dark:bg-red-500/10">
                <div className="text-xs font-medium text-muted-foreground mb-1">Cancelled in period</div>
                <div className="text-2xl font-bold">{cancellationAnalytics.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {cancellationAnalytics.totalInPeriod} total requests in range
                </p>
              </div>
              <div className="rounded-xl border p-4 bg-amber-50/60 dark:bg-amber-500/10">
                <div className="text-xs font-medium text-muted-foreground mb-1">Cancellation rate</div>
                <div className="text-2xl font-bold">{cancellationAnalytics.rate}%</div>
                <p className="text-xs text-muted-foreground mt-1">of requests cancelled</p>
              </div>
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="text-xs font-medium text-muted-foreground mb-1">Total (all time)</div>
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
                  <p className="text-sm text-muted-foreground">No cancellations in this period.</p>
                ) : (
                  <div className="space-y-3">
                    {cancellationAnalytics.reasonData.map((r) => (
                      <div key={r.name} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{r.name}</span>
                          <span className="text-muted-foreground">{r.value} ({r.percentage}%)</span>
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

              {/* Monthly trend chart */}
              <div className="rounded-xl border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-4">Cancellations over time (last 6 months)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={cancellationAnalytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="cancelled" fill="hsl(var(--destructive))" name="Cancelled" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            {cancellationAnalytics.insights.length > 0 && (
              <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20 p-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  Insights
                </h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {cancellationAnalytics.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Pricing (moved to end) */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Dynamic Pricing</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clear, fair adjustments based on volunteer performance, ratings, and current demand.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-4 bg-muted/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Associate</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">Base rate</span>
                </div>
                <p className="text-xs text-muted-foreground">0–4 services • any rating</p>
                <p className="text-sm mt-1">Early-stage contributor building experience.</p>
              </div>
              <div className="rounded-xl border p-4 bg-emerald-50/60 dark:bg-emerald-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Proficient</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">+5%</span>
                </div>
                <p className="text-xs text-muted-foreground">5–19 services • avg rating ≥ 4.2</p>
                <p className="text-sm mt-1">Consistent performance with strong feedback.</p>
              </div>
              <div className="rounded-xl border p-4 bg-blue-50/60 dark:bg-blue-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Advanced</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">+8%</span>
                </div>
                <p className="text-xs text-muted-foreground">20–39 services • avg rating ≥ 4.4</p>
                <p className="text-sm mt-1">Proven track record handling requests well.</p>
              </div>
              <div className="rounded-xl border p-4 bg-amber-50/60 dark:bg-amber-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Expert</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">+12%</span>
                </div>
                <p className="text-xs text-muted-foreground">40+ services • avg rating ≥ 4.6</p>
                <p className="text-sm mt-1">Excellent service history and high ratings.</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border p-4 bg-muted/40">
              <div className="font-medium mb-1">Demand-based Modifier</div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Normal</span><span className="font-medium">+0%</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">High (≥1.0 requests per available volunteer)</span><span className="font-medium">+3%</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Peak (≥1.5)</span><span className="font-medium">+6%</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Surge (≥2.0)</span><span className="font-medium">+10%</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Demand is calculated per time window: competing requests ÷ available matching volunteers.</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Performance tier and demand modifier stack; the combined percentage applies to the base hourly rate.</p>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;