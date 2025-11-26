import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Inbox, Loader2, Star, BarChart3 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Base hourly rates (PHP) per service
const SERVICE_RATES: Record<string, number> = {
  "Companionship": 150,
  "Light Housekeeping": 170,
  "Running Errands": 200,
  "Home Visits": 180,
  // "Socialization" intentionally omitted from display; legacy data will be normalized out
};

type AdjustmentInfo = { tier: "Associate" | "Proficient" | "Advanced" | "Expert"; percent: number };
const getDynamicAdjustment = (tasksCompleted: number, avgRating: number | null | undefined): AdjustmentInfo => {
  const r = typeof avgRating === "number" ? avgRating : 0;
  if (tasksCompleted >= 40 && r >= 4.6) return { tier: "Expert", percent: 0.12 };
  if (tasksCompleted >= 20 && r >= 4.4) return { tier: "Advanced", percent: 0.08 };
  if (tasksCompleted >= 5 && r >= 4.2) return { tier: "Proficient", percent: 0.05 };
  return { tier: "Associate", percent: 0 };
};

const formatPHP = (v: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(v);
const genConfirmation = () => `#SR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const ServiceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[] | null>(null);
  const [volunteers, setVolunteers] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});
  const [assignmentByRequest, setAssignmentByRequest] = useState<Record<string, any>>({});
  const [page, setPage] = useState<number>(1);
  const perPage = 5;
  const [busyByDate, setBusyByDate] = useState<Record<number, Record<string, Array<[number, number]>>>>({});

  useEffect(() => {
    const q = query(collection(db, "serviceRequests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => { setPage(1); }, [/* reset on new data */ requests?.length]);

  useEffect(() => {
    const q = query(collection(db, "pendingVolunteers"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  // Live ratings aggregation (by volunteer email)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const sums: Record<string, { sum: number; count: number }> = {};
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const email = (r.volunteerEmail || "").toLowerCase();
        const value = Number(r.rating) || 0;
        if (!email || value <= 0) return;
        if (!sums[email]) sums[email] = { sum: 0, count: 0 };
        sums[email].sum += value;
        sums[email].count += 1;
      });
      const avg: Record<string, { avg: number; count: number }> = {};
      Object.keys(sums).forEach((email) => {
        const { sum, count } = sums[email];
        avg[email] = { avg: sum / count, count };
      });
      setRatingsMap(avg);
    });
    return () => unsub();
  }, []);

  // Live tasks completed aggregation (by volunteer email) and map assignments by request for pricing display
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      const counts: Record<string, number> = {};
      const byRequest: Record<string, any> = {};
      snap.docs.forEach((d) => {
        const a = d.data() as any;
        const email = (a.volunteerEmail || "").toLowerCase();
        if (!email) return;
        const isCompleted = a.status === "completed";
        const confirmed = a.guardianConfirmed === true; // require elder confirmation for reliability
        if (isCompleted && confirmed) {
          counts[email] = (counts[email] || 0) + 1;
        }
        // Keep the latest assignment per request for display (usually one)
        const rid = a.requestId;
        if (rid) {
          const cur = byRequest[rid];
          const curTs = cur?.createdAt?.toMillis?.() ?? (typeof cur?.createdAt === "number" ? cur.createdAt : 0);
          const nextTs = a.createdAt?.toMillis?.() ?? (typeof a.createdAt === "number" ? a.createdAt : 0);
          if (!cur || nextTs >= curTs) {
            byRequest[rid] = { id: d.id, ...a };
          }
        }
      });
      setTasksMap(counts);
      setAssignmentByRequest(byRequest);
    });
    return () => unsub();
  }, []);

  // Time helpers and availability map for visible dates
  const toMinutes = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = String(t).split(":").map((x: string) => parseInt(x || "0", 10));
    if (!isFinite(h)) return null;
    return h * 60 + (m || 0);
  };
  const hasOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;
  useEffect(() => {
    if (!requests || requests.length === 0) { setBusyByDate({}); return; }
    const totalPages = Math.max(1, Math.ceil(requests.length / perPage));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * perPage;
    const items = requests.slice(start, start + perPage);
    const dates = Array.from(new Set(items.map((r) => Number(r.serviceDateTS)).filter((n) => Number.isFinite(n))));
    const oneDayMs = 24 * 60 * 60 * 1000;
    const unsubs = dates.map((dayMs) => {
      // Clear the day entry immediately to avoid stale data during reloading
      setBusyByDate((prev) => ({ ...prev, [dayMs]: {} }));
      const q = query(collection(db, "assignments"), where("serviceDateTS", "==", dayMs));
      return onSnapshot(q, (snap) => {
        const perEmail: Record<string, Array<[number, number]>> = {};
        // Spillover to next day for cross-midnight intervals
        const spillToNextDay: Record<string, Array<[number, number]>> = {};
        snap.docs.forEach((d) => {
          const a = d.data() as any;
          const email = (a.volunteerEmail || "").toLowerCase();
          const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const sMin = sh * 60 + (sm || 0);
          const eMin = eh * 60 + (em || 0);
          if (!email || !isFinite(sMin) || !isFinite(eMin)) return;
          if (a.status === "cancelled") return;
          if (!perEmail[email]) perEmail[email] = [];
          if (eMin <= sMin) {
            // Interval crosses midnight; split and spill
            perEmail[email].push([sMin, 24 * 60]);
            if (!spillToNextDay[email]) spillToNextDay[email] = [];
            if (eMin > 0) spillToNextDay[email].push([0, eMin]);
          } else {
            perEmail[email].push([sMin, eMin]);
          }
        });
        setBusyByDate((prev) => {
          const next: typeof prev = { ...prev, [dayMs]: perEmail };
          // Merge spillover into next day map
          if (Object.keys(spillToNextDay).length > 0) {
            const key = dayMs + oneDayMs;
            const existing = next[key] || {};
            const merged: Record<string, Array<[number, number]>> = { ...existing };
            Object.entries(spillToNextDay).forEach(([email, arr]) => {
              merged[email] = [...(merged[email] || []), ...arr];
            });
            next[key] = merged;
          }
          return next;
        });
      });
    });
    return () => { unsubs.forEach((u) => u()); };
  }, [requests, page]);

  const toServiceId = (nameOrId: string): "companionship" | "housekeeping" | "errands" | "visits" | "socialization" | "unknown" => {
    const v = (nameOrId || "").toLowerCase();
    if (v.includes("companionship")) return "companionship";
    if (v.includes("housekeeping")) return "housekeeping";
    if (v.includes("errand")) return "errands";
    if (v.includes("visit")) return "visits";
    if (v.includes("social")) return "socialization";
    return "unknown";
  };
  const ALLOWED_SERVICE_LABELS: Record<"companionship" | "housekeeping" | "errands" | "visits", string> = {
    companionship: "Companionship",
    housekeeping: "Light Housekeeping",
    errands: "Running Errands",
    visits: "Home Visits",
  };
  const normalizeServiceLabels = (services: string[] | undefined | null): string[] => {
    const set = new Set<string>();
    (services || []).forEach((s) => {
      const id = toServiceId(s);
      if (id === "companionship" || id === "housekeeping" || id === "errands" || id === "visits") {
        set.add(ALLOWED_SERVICE_LABELS[id]);
      }
    });
    return Array.from(set);
  };

  const getCompatibleVolunteers = (req: any): any[] => {
    if (!volunteers) return [];
    const reqServiceIds: string[] = Array.isArray(req.services)
      ? req.services.map((s: string) => toServiceId(s))
      : req.service ? [toServiceId(req.service)] : [];
    const prefEmail = (req?.preferredVolunteerEmail || "").toLowerCase();
    // Enrich every approved volunteer (do not filter out), compute service match count
    const enriched = volunteers.map((v) => {
      const emailKey = (v.email || "").toLowerCase();
      const agg = ratingsMap[emailKey];
      const tasksDone = tasksMap[emailKey] ?? 0;
      const normalizedServices = normalizeServiceLabels(v.services);
      const volServiceIds: string[] = normalizedServices.map((s: string) => toServiceId(s));
      const serviceMatchCount = reqServiceIds.filter((sid) => volServiceIds.includes(sid)).length;
      const isPreferred = emailKey === prefEmail;
      const available = isVolunteerAvailableForRequest(v, req);
      return {
        ...v,
        services: normalizedServices,
        rating: agg?.avg ?? null,
        ratingCount: agg?.count ?? 0,
        tasksCompleted: tasksDone,
        serviceMatchCount,
        isPreferred,
        available,
      };
    });
    // Sort priority: preferred desc, serviceMatchCount desc, rating desc, tasks desc, availability desc
    return enriched.sort((a, b) => {
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      if (a.serviceMatchCount !== b.serviceMatchCount) return b.serviceMatchCount - a.serviceMatchCount;
      const ar = a.rating ?? 0, br = b.rating ?? 0;
      if (ar !== br) return br - ar;
      const at = a.tasksCompleted ?? 0, bt = b.tasksCompleted ?? 0;
      if (at !== bt) return bt - at;
      if (a.available !== b.available) return a.available ? -1 : 1;
      return 0;
    });
  };

  const chunkList = (arr: any[], size: number) => {
    const pages: any[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      pages.push(arr.slice(i, i + size));
    }
    return pages;
  };

  const renderStars = (ratingNum: number) => {
    const full = Math.round(ratingNum ?? 0);
    return (
      <div className="flex items-center gap-0.5" aria-label={`Rating ${full} out of 5`}>
        {[0,1,2,3,4].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i < full ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
        ))}
      </div>
    );
  };

  // Removed old static volunteers list; now using Firestore "pendingVolunteers" (approved)

  // Demand-based modifier uses competing requests vs available matching volunteers in the window
  const getDemandModifier = (req: any): { tier: "Normal" | "High" | "Peak" | "Surge"; percent: number; ratio: number } => {
    try {
      const day = Number(req.serviceDateTS);
      const s = toMinutes(req.startTime24), e = toMinutes(req.endTime24);
      if (!Number.isFinite(day) || s == null || e == null) return { tier: "Normal", percent: 0, ratio: 0 };
      const reqServiceIds: string[] = Array.isArray(req.services)
        ? req.services.map((x: string) => toServiceId(x))
        : req.service ? [toServiceId(req.service)] : [];
      const serviceMatch = (services: string[] | undefined | null) => {
        const ids = (services || []).map((x: string) => toServiceId(x));
        return reqServiceIds.some((id) => ids.includes(id));
      };
      // Available volunteers for these services at this time
      const availableVols = (volunteers || []).filter((v) => {
        const normalized = normalizeServiceLabels(v.services || []);
        return serviceMatch(normalized) && isVolunteerAvailableForRequest(v, req);
      }).length;
      // Competing requests in the same window (pending or assigned)
      const competing = (requests || []).filter((r) => {
        if (r.id === req.id) return false;
        if (Number(r.serviceDateTS) !== day) return false;
        const rs = toMinutes(r.startTime24), re = toMinutes(r.endTime24);
        if (rs == null || re == null) return false;
        const st = (r.status || "pending").toLowerCase();
        if (!(st === "pending" || st === "assigned")) return false;
        const arr: string[] = Array.isArray(r.services) ? r.services : (r.service ? [r.service] : []);
        if (!serviceMatch(arr)) return false;
        return hasOverlap(s, e, rs, re);
      }).length;
      const ratio = availableVols > 0 ? competing / availableVols : competing >= 1 ? 2.5 : 0;
      if (ratio >= 2.0) return { tier: "Surge", percent: 0.10, ratio };
      if (ratio >= 1.5) return { tier: "Peak", percent: 0.06, ratio };
      if (ratio >= 1.0) return { tier: "High", percent: 0.03, ratio };
      return { tier: "Normal", percent: 0, ratio };
    } catch {
      return { tier: "Normal", percent: 0, ratio: 0 };
    }
  };

  const isVolunteerAvailableForRequest = (vol: any, req: any): boolean => {
    if (!req || !vol) return true;
    const day = Number(req.serviceDateTS);
    const s = toMinutes(req.startTime24);
    const e = toMinutes(req.endTime24);
    if (!Number.isFinite(day) || s == null || e == null) return true;
    const map = busyByDate[day] || {};
    const intervals = map[(vol.email || "").toLowerCase()] || [];
    return !intervals.some(([bs, be]) => hasOverlap(s, e, bs, be));
  };

  const handleAssign = async (requestId: string, volunteer: any) => {
    try {
      const req = (requests || []).find((r) => r.id === requestId);
      if (req) {
        // Quick UI availability check
        const uiAvailable = isVolunteerAvailableForRequest(volunteer, req);
        if (!uiAvailable) {
          toast({ title: "Schedule conflict", description: "This volunteer is not available for the selected time.", variant: "destructive" });
          return;
        }
        // Server-side double-check
        const aSnap = await getDocs(query(
          collection(db, "assignments"),
          where("volunteerEmail", "==", volunteer.email || null),
          where("serviceDateTS", "==", Number(req.serviceDateTS) || 0)
        ));
        const s = toMinutes(req.startTime24), e = toMinutes(req.endTime24);
        let conflict = false;
        aSnap.docs.forEach((d) => {
          const a = d.data() as any;
          const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const bs = sh * 60 + (sm || 0);
          const be = eh * 60 + (em || 0);
          if (a.status !== "cancelled" && s != null && e != null && hasOverlap(s, e, bs, be)) {
            conflict = true;
          }
        });
        if (conflict) {
          toast({ title: "Schedule conflict", description: "This volunteer has another assignment at that time.", variant: "destructive" });
          return;
        }

        await updateDoc(doc(db, "serviceRequests", requestId), { status: "assigned", assignedTo: volunteer.fullName });
        // Create assignment for volunteer portal
        let volunteerUid: string | null = null;
        try {
          if (volunteer.email) {
            const uQ = query(collection(db, "users"), where("email", "==", volunteer.email), limit(1));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) volunteerUid = uSnap.docs[0].id;
          }
        } catch {}
        // Compute dynamic pricing at assignment time
        const emailKey = (volunteer.email || "").toLowerCase();
        const ratingAgg = ratingsMap[emailKey];
        const tasksDone = tasksMap[emailKey] ?? 0;
        const { tier, percent } = getDynamicAdjustment(tasksDone, ratingAgg?.avg);
        const demand = getDemandModifier(req);
        const combinedPercent = percent + (demand.percent || 0);

        const perServiceHoursByName: Record<string, number> = (req.perServiceHoursByName && typeof req.perServiceHoursByName === "object") ? req.perServiceHoursByName : {};
        const selectedServices: string[] = Array.isArray(req.services) ? req.services : (req.service ? [req.service] : []);
        const lineItems = selectedServices.map((name: string) => {
          const baseRate = SERVICE_RATES[name] ?? 0;
          const hours = Math.max(0, Number(perServiceHoursByName?.[name] ?? 0));
          const adjustedRate = baseRate * (1 + combinedPercent);
          const amount = adjustedRate * hours;
          return { name, baseRate, hours, adjustedRate, amount };
        }).filter((li) => li.hours > 0);
        const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
        const commission = subtotal * 0.05;
        const total = subtotal + commission;
        const confirmationNumber = genConfirmation();

        await addDoc(collection(db, "assignments"), {
          requestId,
          volunteerDocId: volunteer.id,
          volunteerEmail: volunteer.email || null,
          volunteerName: volunteer.fullName,
          volunteerUid,
          elderUserId: req.userId || null,
          elderName: req.elderName,
          address: req.address,
          services: req.services || (req.service ? [req.service] : []),
          perServiceHoursByName: perServiceHoursByName || null,
          serviceDateTS: req.serviceDateTS || null,
          startTime24: req.startTime24 || null,
          endTime24: req.endTime24 || null,
          startTimeText: req.startTimeText || null,
          endTimeText: req.endTimeText || null,
          notes: req.notes || null,
          receipt: {
            confirmationNumber,
            lineItems,
            subtotal,
            commission,
            total,
            dynamicPricing: {
              tier, // performance tier
              percent: combinedPercent,
              components: {
                performance: { tier, percent },
                demand,
              },
            },
          },
          receiptIssuedAt: serverTimestamp(),
          status: "assigned",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({ title: "Volunteer Assigned", description: `${volunteer.fullName} has been assigned. Receipt sent to elder notifications.` });
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-green-500">Assigned</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      "Companionship": "border-l-purple-500",
      "Running Errands": "border-l-blue-500",
      "Light Housekeeping": "border-l-green-500",
      "Home Visits": "border-l-orange-500",
      "Socialization": "border-l-pink-500",
    };
    return colors[service] || "border-l-primary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
          <p className="text-muted-foreground">View and manage all service requests</p>
        </div>

        <div className="grid gap-6">
          {requests === null ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No service requests yet.</p>
            </div>
          ) : (() => {
            const totalPages = Math.max(1, Math.ceil(requests.length / perPage));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * perPage;
            const pageItems = requests.slice(start, start + perPage);
            return (
              <>
                {pageItems.map((request) => (
            <Card key={request.id} className={`border-l-4 ${getServiceColor((request.services?.[0]) || request.service || "")}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.elderName}</CardTitle>
                    <p className="text-lg font-semibold text-primary mt-1">{Array.isArray(request.services) ? request.services.join(", ") : request.service}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.serviceDateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.startTimeText} - {request.endTimeText}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{request.address}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {request.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{request.assignedTo}</span>
                      </div>
                    )}
                    {request.preferredVolunteerName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Preferred by guardian: <span className="font-medium">{request.preferredVolunteerName}</span></span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-1">Additional Notes</p>
                      <p className="text-sm text-muted-foreground">{request.notes || "—"}</p>
                    </div>
                  {request.status === "cancelled" && (
                    <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-500/10">
                      <p className="text-sm font-medium mb-1">Cancellation</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Reason</span>
                          <span className="font-medium">
                            {(() => {
                              const map: Record<string, string> = {
                                schedule_change: "Schedule changed",
                                price_high: "Price is too high",
                                preferred_unavailable: "Preferred volunteer unavailable",
                                entered_wrong_info: "Entered wrong information",
                                other: "Other",
                              };
                              return map[request.cancelReasonCode] || "—";
                            })()}
                          </span>
                        </div>
                        {!!request.cancelReasonText && (
                          <div className="flex items-start justify-between gap-2">
                            <span>Comment</span>
                            <span className="font-medium text-right">{request.cancelReasonText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    {request.status === "assigned" && assignmentByRequest[request.id]?.receipt && (
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-sm font-medium mb-1">Dynamic Pricing</p>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>Tier</span>
                            <span className="font-medium">
                              {assignmentByRequest[request.id].receipt.dynamicPricing?.tier} (
                                {Math.round((assignmentByRequest[request.id].receipt.dynamicPricing?.percent ?? 0) * 100)}%
                              )
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total</span>
                            <span className="font-semibold text-foreground">
                              {formatPHP(assignmentByRequest[request.id].receipt.total ?? 0)}
                            </span>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="mt-2 text-xs text-primary hover:underline">View pricing details</button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Pricing Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                              {(() => {
                                const dp = assignmentByRequest[request.id].receipt.dynamicPricing || {};
                                const perf = dp.components?.performance;
                                const dem = dp.components?.demand;
                                const pct = (n: number | undefined) => `${Math.round((n ?? 0) * 100)}%`;
                                return (
                                  <div className="rounded-lg border p-2 bg-muted/40 mb-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Performance tier</span>
                                      <span className="font-medium">{perf?.tier || dp.tier} • {pct(perf?.percent ?? dp.percent)}</span>
                                    </div>
                                    {dem && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Demand modifier</span>
                                        <span className="font-medium">{dem.tier} • {pct(dem.percent)} {typeof dem.ratio === "number" ? `(ratio ${dem.ratio.toFixed(2)})` : ""}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              {(assignmentByRequest[request.id].receipt.lineItems || []).map((li: any) => (
                                <div key={li.name} className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    {li.name} ({formatPHP(li.adjustedRate ?? li.baseRate)}/hr × {(li.hours ?? 0).toFixed(2)} hr)
                                  </span>
                                  <span className="font-medium">{formatPHP(li.amount ?? 0)}</span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatPHP(assignmentByRequest[request.id].receipt.subtotal ?? 0)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Commission (5%)</span>
                                <span className="font-medium">{formatPHP(assignmentByRequest[request.id].receipt.commission ?? 0)}</span>
                              </div>
                              <div className="flex items-center justify-between text-base pt-1">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold text-primary">{formatPHP(assignmentByRequest[request.id].receipt.total ?? 0)}</span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Suggested Volunteers</label>
                      <span className="text-xs text-muted-foreground">Sorted by rating and relevance</span>
                    </div>
                    {(() => {
                      const compatible = getCompatibleVolunteers(request);
                      if (compatible.length === 0) {
                        return <div className="text-sm text-muted-foreground">No matching volunteers found.</div>;
                      }
                      const pages = chunkList(compatible, 3);
                      return (
                        <div className="relative rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-5">
                          <Carousel className="px-8 md:px-10">
                            <CarouselContent>
                              {pages.map((page, idx) => (
                                <CarouselItem key={idx}>
                                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {page.map((v) => {
                                      const hasRating = typeof v.rating === "number" && v.rating > 0;
                                      const tasks = v.tasksCompleted ?? 0;
                                      const volServiceIds: string[] = Array.isArray(v.services) ? v.services.map((s: string) => toServiceId(s)) : [];
                                      const reqServiceIds: string[] = Array.isArray(request.services)
                                        ? request.services.map((s: string) => toServiceId(s))
                                        : request.service ? [toServiceId(request.service)] : [];
                                      const matches = reqServiceIds.filter((id: string) => volServiceIds.includes(id));
                                      const matchPct = reqServiceIds.length ? Math.round((matches.length / reqServiceIds.length) * 100) : 0;
                                      const preferred = ((v.email || "").toLowerCase() === (request?.preferredVolunteerEmail || "").toLowerCase());
                                      return (
                                        <div key={v.id} className="rounded-2xl border bg-card/70 backdrop-blur shadow-sm hover:shadow-md transition-shadow overflow-hidden select-none">
                                          <div className="p-5 cursor-grab active:cursor-grabbing">
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                                                  <User className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-semibold leading-tight truncate">
                                                    {v.fullName}
                                                    {preferred && <span className="ml-2 align-middle text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Preferred</span>}
                                                  </p>
                                                  <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium">Volunteer</p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                {hasRating ? (
                                                  <>
                                                    {renderStars(v.rating)}
                                                    <p className="text-xs text-muted-foreground mt-0.5">{v.rating.toFixed(1)} rating</p>
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">Not yet rated</span>
                                                )}
                                              </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                                              {(v.bio || `Experienced in ${Array.isArray(v.services) ? v.services.slice(0,2).join(" and ") : "care"} services.`).toString()}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                              {normalizeServiceLabels(v.services || []).slice(0, 3).map((s: string) => (
                                                <Badge key={s} variant="outline" className="capitalize text-xs">
                                                  {s.replace("_", " ")}
                                                </Badge>
                                              ))}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground pb-4 border-b">
                                              <div className="flex items-center gap-1">
                                                <BarChart3 className="h-4 w-4" />
                                                <span>{tasks} tasks</span>
                                              </div>
                                              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50" />
                                              <span>{matchPct}% match • {matches.map((m) => m[0]?.toUpperCase() + m.slice(1)).join(", ") || "No match"}</span>
                                              <span className={`ml-auto ${isVolunteerAvailableForRequest(v, request) ? "text-emerald-600" : "text-destructive"}`}>
                                                {isVolunteerAvailableForRequest(v, request) ? "Available" : "Conflict"}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-5 py-3 bg-muted/30 cursor-default select-auto">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <button className="text-sm text-primary hover:underline font-medium">Read more</button>
                                              </DialogTrigger>
                                              <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                  <DialogTitle>{v.fullName}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 text-sm text-muted-foreground">
                                                  <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    <span>{v.email || "Email not provided"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Phone:</span>
                                                    <span>{v.phone || "Phone not provided"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Rating:</span>
                                                    <span>{hasRating ? v.rating.toFixed(1) : 'Not yet rated'}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Tasks completed:</span>
                                                    <span>{tasks}</span>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium text-foreground mb-1">Services</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {normalizeServiceLabels(v.services || []).map((s: string) => (
                                                        <Badge key={s} variant="secondary" className="capitalize">{s.replace("_", " ")}</Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className={`font-medium ${isVolunteerAvailableForRequest(v, request) ? "text-emerald-600" : "text-destructive"}`}>
                                                    Availability: {isVolunteerAvailableForRequest(v, request) ? "Available" : "Conflict at selected time"}
                                                  </div>
                                                  {v.bio && (
                                                    <div>
                                                      <p className="font-medium text-foreground mb-1">About</p>
                                                      <p>{v.bio}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                            <Button onClick={() => handleAssign(request.id, v)} disabled={!isVolunteerAvailableForRequest(v, request)} aria-disabled={!isVolunteerAvailableForRequest(v, request)}>
                                              {isVolunteerAvailableForRequest(v, request) ? "Assign" : "Unavailable"}
                                            </Button>
                    </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 bg-background/90 shadow border" />
                            <CarouselNext className="right-2 top-1/2 -translate-y-1/2 bg-background/90 shadow border" />
                          </Carousel>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
                <Pagination className="mt-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }} href="#" />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={safePage === (i + 1)} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }} href="#" />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            );
          })()}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceRequests;
