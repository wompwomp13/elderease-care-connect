import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VolunteerAvatar } from "@/components/VolunteerAvatar";
import { Calendar, Clock, MapPin, User, Inbox, Loader2, Star, BarChart3, Trash2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { deletePendingServiceRequestNotifications } from "@/lib/guardian-notifications";
import { getAssignmentServiceDayMs, leaveDocOverlapsCalendarDay } from "@/lib/volunteer-leave";

/** Service request day key aligned with assignments / leave queries (handles Timestamp or ms). */
function getRequestDayMs(req: { serviceDateTS?: unknown }): number | null {
  const ms = getAssignmentServiceDayMs({ serviceDateTS: req.serviceDateTS as number | { toMillis?: () => number } | undefined });
  return ms > 0 ? ms : null;
}

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
  const [leaveEmailsByDay, setLeaveEmailsByDay] = useState<Record<number, Set<string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "serviceRequests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!requests) return;
    if (requests.length === 0) {
      setPage(1);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(requests.length / perPage));
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [requests?.length, perPage]);

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
    const dates = Array.from(
      new Set(
        items
          .map((r) => getRequestDayMs(r))
          .filter((n): n is number => n != null)
      )
    );
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
          if (a.status === "cancelled" || a.status === "declined") return;
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

  useEffect(() => {
    if (!requests || requests.length === 0) {
      setLeaveEmailsByDay({});
      return;
    }
    const totalPages = Math.max(1, Math.ceil(requests.length / perPage));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * perPage;
    const items = requests.slice(start, start + perPage);
    const dates = Array.from(
      new Set(
        items
          .map((r) => getRequestDayMs(r))
          .filter((n): n is number => n != null)
      )
    );
    if (dates.length === 0) {
      setLeaveEmailsByDay({});
      return;
    }
    const minDay = Math.min(...dates);
    // One range filter avoids composite index; overlap per request day is applied client-side.
    const q = query(collection(db, "volunteerLeave"), where("endDayMs", ">=", minDay));
    const unsub = onSnapshot(q, (snap) => {
      setLeaveEmailsByDay((prev) => {
        const next = { ...prev };
        for (const dayMs of dates) {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const row = leaveDocOverlapsCalendarDay(d.data() as Record<string, unknown>, dayMs);
            if (!row) return;
            const em = row.volunteerEmail.toLowerCase().trim();
            if (em) s.add(em);
          });
          next[dayMs] = s;
        }
        return next;
      });
    });
    return () => unsub();
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

  /** Compact rating for volunteer cards (avoids clipping in narrow columns). */
  const renderRatingSummary = (ratingNum: number | null | undefined) => {
    if (typeof ratingNum !== "number" || ratingNum <= 0) {
      return <span className="text-xs text-muted-foreground whitespace-nowrap">Not rated</span>;
    }
    const r = ratingNum.toFixed(1);
    return (
      <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-0" aria-label={`Rating ${r} out of 5`}>
        <div className="flex items-center gap-0.5 text-amber-500 sm:gap-1">
          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500 sm:h-4 sm:w-4" aria-hidden />
          <span className="text-xs font-semibold tabular-nums leading-none sm:text-sm">{r}</span>
        </div>
        <span className="hidden text-[10px] text-muted-foreground whitespace-nowrap sm:block">out of 5</span>
      </div>
    );
  };

  // Removed old static volunteers list; now using Firestore "pendingVolunteers" (approved)

  // Demand-based modifier uses competing requests vs available matching volunteers in the window
  const getDemandModifier = (req: any): { tier: "Normal" | "High" | "Peak" | "Surge"; percent: number; ratio: number } => {
    try {
      const day = getRequestDayMs(req);
      const s = toMinutes(req.startTime24), e = toMinutes(req.endTime24);
      if (day == null || s == null || e == null) return { tier: "Normal", percent: 0, ratio: 0 };
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
        if (getRequestDayMs(r) !== day) return false;
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
    const day = getRequestDayMs(req);
    const s = toMinutes(req.startTime24);
    const e = toMinutes(req.endTime24);
    if (day == null || s == null || e == null) return true;
    const emailKey = (vol.email || "").toLowerCase();
    if (leaveEmailsByDay[day]?.has(emailKey)) return false;
    const map = busyByDate[day] || {};
    const intervals = map[emailKey] || [];
    return !intervals.some(([bs, be]) => hasOverlap(s, e, bs, be));
  };

  const isVolunteerOnLeaveForRequest = (vol: any, req: any): boolean => {
    if (!req || !vol) return false;
    const day = getRequestDayMs(req);
    if (day == null) return false;
    const emailKey = (vol.email || "").toLowerCase();
    return leaveEmailsByDay[day]?.has(emailKey) ?? false;
  };

  const hasVolunteerDeclinedRequest = (vol: any, req: any): boolean => {
    if (!vol || !req) return false;
    const emailKey = (vol.email || "").toLowerCase();
    const preferredDeclined = (req.preferredVolunteerDeclinedBy || []) as string[];
    if (preferredDeclined.some((e: string) => (e || "").toLowerCase() === emailKey)) return true;
    const adminDeclined = (req.adminAssignedDeclinedBy || []) as string[];
    if (adminDeclined.some((e: string) => (e || "").toLowerCase() === emailKey)) return true;
    const assignment = assignmentByRequest[req.id];
    if (assignment?.status === "declined" && (assignment.volunteerEmail || "").toLowerCase() === emailKey) return true;
    return false;
  };

  const handleAssign = async (requestId: string, volunteer: any) => {
    try {
      const reqForCheck = (requests || []).find((r) => r.id === requestId);
      if (reqForCheck && hasVolunteerDeclinedRequest(volunteer, reqForCheck)) {
        toast({ title: "Cannot assign", description: "This volunteer has declined this request.", variant: "destructive" });
        return;
      }
      const reqRef = doc(db, "serviceRequests", requestId);
      const freshSnap = await getDoc(reqRef);
      if (!freshSnap.exists()) {
        toast({ title: "Request not found", variant: "destructive" });
        return;
      }
      const fresh = freshSnap.data() as any;
      if ((fresh.status || "").toLowerCase() !== "pending") {
        toast({ title: "Already assigned", description: "This request was just assigned by a volunteer or another admin.", variant: "destructive" });
        return;
      }
      const req = (requests || []).find((r) => r.id === requestId) || fresh;
      if (req) {
        // Quick UI availability check
        const uiAvailable = isVolunteerAvailableForRequest(volunteer, req);
        if (!uiAvailable) {
          if (isVolunteerOnLeaveForRequest(volunteer, req)) {
            toast({
              title: "Volunteer on leave",
              description: "This volunteer marked this day as time off. Choose someone else or ask them to update time off.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Schedule conflict", description: "This volunteer is not available for the selected time.", variant: "destructive" });
          }
          return;
        }
        // Server-side double-check
        const reqDay = getRequestDayMs(req) ?? 0;
        const volEmailKey = (volunteer.email || "").toLowerCase().trim();
        const aSnap =
          volEmailKey.length > 0
            ? await getDocs(
                query(
                  collection(db, "assignments"),
                  where("volunteerEmail", "==", volEmailKey),
                  where("serviceDateTS", "==", reqDay)
                )
              )
            : { docs: [] as never[] };
        const s = toMinutes(req.startTime24), e = toMinutes(req.endTime24);
        let conflict = false;
        aSnap.docs.forEach((d) => {
          const a = d.data() as any;
          const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
          const bs = sh * 60 + (sm || 0);
          const be = eh * 60 + (em || 0);
          if (a.status !== "cancelled" && a.status !== "declined" && s != null && e != null && hasOverlap(s, e, bs, be)) {
            conflict = true;
          }
        });
        if (conflict) {
          toast({ title: "Schedule conflict", description: "This volunteer has another assignment at that time.", variant: "destructive" });
          return;
        }

        if (volEmailKey && reqDay > 0) {
          const leaveSnap = await getDocs(query(collection(db, "volunteerLeave"), where("endDayMs", ">=", reqDay)));
          const serverOnLeave = leaveSnap.docs.some((d) => {
            const row = leaveDocOverlapsCalendarDay(d.data() as Record<string, unknown>, reqDay);
            return row && row.volunteerEmail.toLowerCase().trim() === volEmailKey;
          });
          if (serverOnLeave) {
            toast({
              title: "Volunteer on leave",
              description: "This volunteer has time off on that day. They must update Time off before assignment.",
              variant: "destructive",
            });
            return;
          }
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
          volunteerEmail: (volunteer.email || "").toLowerCase() || null,
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
        await deletePendingServiceRequestNotifications(db, requestId);
      }
      toast({ title: "Volunteer Assigned", description: `${volunteer.fullName} has been assigned. Receipt sent to elder notifications.` });
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!requestId) return;
    setDeletingId(requestId);
    try {
      const assignmentsSnap = await getDocs(query(collection(db, "assignments"), where("requestId", "==", requestId)));
      const assignmentIds = assignmentsSnap.docs.map((d) => d.id);

      for (const aId of assignmentIds) {
        const ratingsSnap = await getDocs(query(collection(db, "ratings"), where("assignmentId", "==", aId)));
        for (const r of ratingsSnap.docs) {
          await deleteDoc(doc(db, "ratings", r.id));
        }
      }

      const notifSnap = await getDocs(query(collection(db, "notifications"), where("requestId", "==", requestId)));
      for (const n of notifSnap.docs) {
        await deleteDoc(doc(db, "notifications", n.id));
      }

      for (const aId of assignmentIds) {
        const notifByAssign = await getDocs(query(collection(db, "notifications"), where("assignmentId", "==", aId)));
        for (const n of notifByAssign.docs) {
          await deleteDoc(doc(db, "notifications", n.id));
        }
        await deleteDoc(doc(db, "assignments", aId));
      }

      await deleteDoc(doc(db, "serviceRequests", requestId));
      toast({ title: "Request deleted", description: "The request and all related data have been removed." });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
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
                {pageItems.map((request) => {
                  const assignment = assignmentByRequest[request.id];
                  const isFullyCompleted = assignment?.status === "completed" && assignment?.guardianConfirmed === true;
                  const effectiveStatus = isFullyCompleted ? "completed" : request.status;
                  return (
            <Card key={request.id} className="border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.elderName}</CardTitle>
                    <p className="text-lg font-semibold text-primary mt-1">{Array.isArray(request.services) ? request.services.join(", ") : request.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(effectiveStatus)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(request)}
                      aria-label="Delete request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                        {request.acceptedByVolunteer && (
                          <Badge variant="secondary" className="text-xs">Volunteer accepted</Badge>
                        )}
                      </div>
                    )}
                    {request.preferredVolunteerName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Preferred by guardian: <span className="font-medium">{request.preferredVolunteerName}</span></span>
                      </div>
                    )}
                    {request.status === "pending" && (assignmentByRequest[request.id]?.status === "declined" || (request.preferredVolunteerDeclinedBy?.length ?? 0) > 0 || request.preferredVolunteerDeclineReason) && (
                      <div className="rounded-md border border-red-200 dark:border-red-800/50 bg-card p-2.5">
                        {assignmentByRequest[request.id]?.status === "declined" ? (
                          <>
                            <p className="text-sm font-medium">Volunteer declined (admin-assigned)</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {assignmentByRequest[request.id].volunteerName || "Volunteer"} declined.
                            </p>
                            {assignmentByRequest[request.id].declineReason && (
                              <p className="text-xs mt-1.5 italic">&ldquo;{assignmentByRequest[request.id].declineReason}&rdquo;</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Preferred volunteer declined</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {request.preferredVolunteerName || request.preferredVolunteerEmail || "The preferred volunteer"} declined.
                            </p>
                            {request.preferredVolunteerDeclineReason && (
                              <p className="text-xs mt-1.5 italic">&ldquo;{request.preferredVolunteerDeclineReason}&rdquo;</p>
                            )}
                          </>
                        )}
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
                        <div className="relative rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 sm:p-5">
                          <Carousel className="px-8 md:px-10" opts={{ align: "start", containScroll: "trimSnaps" }}>
                            <CarouselContent>
                              {pages.map((page, idx) => (
                                <CarouselItem key={idx}>
                                  <div className="grid grid-cols-3 gap-3 md:gap-5">
                                    {page.map((v) => {
                                      const hasRating = typeof v.rating === "number" && v.rating > 0;
                                      const tasks = v.tasksCompleted ?? 0;
                                      const volServiceIds: string[] = Array.isArray(v.services) ? v.services.map((s: string) => toServiceId(s)) : [];
                                      const reqServiceIds: string[] = Array.isArray(request.services)
                                        ? request.services.map((s: string) => toServiceId(s))
                                        : request.service ? [toServiceId(request.service)] : [];
                                      const matches = reqServiceIds.filter((id: string) => volServiceIds.includes(id));
                                      const matchPct = reqServiceIds.length ? Math.round((matches.length / reqServiceIds.length) * 100) : 0;
                                      const matchLabels = matches.map((m) => m[0]?.toUpperCase() + m.slice(1)).join(", ") || "No overlap";
                                      const preferred = ((v.email || "").toLowerCase() === (request?.preferredVolunteerEmail || "").toLowerCase());
                                      const declined = hasVolunteerDeclinedRequest(v, request);
                                      const onLeave = isVolunteerOnLeaveForRequest(v, request);
                                      const available = isVolunteerAvailableForRequest(v, request);
                                      const canAssign = !declined && available;
                                      const assignButtonLabel = canAssign
                                        ? "Assign"
                                        : declined
                                          ? "Unavailable"
                                          : onLeave
                                            ? "On leave"
                                            : "Unavailable";
                                      return (
                                        <div
                                          key={v.id}
                                          className={`flex min-h-0 min-w-0 flex-col rounded-2xl border bg-card/70 shadow-sm backdrop-blur transition-shadow select-none hover:shadow-md ${declined ? "border-2 border-red-200 dark:border-red-800/60" : ""}`}
                                        >
                                          <div className="min-h-0 min-w-0 flex-1 cursor-grab p-4 active:cursor-grabbing sm:p-5">
                                            <div className="mb-3 flex items-start justify-between gap-2">
                                              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                                <VolunteerAvatar profilePhotoUrl={v.profilePhotoUrl} name={v.fullName} size="md" className="shrink-0" />
                                                <div className="min-w-0">
                                                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-semibold leading-tight">
                                                    <span className="break-words">{v.fullName}</span>
                                                    {preferred && (
                                                      <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                                        Preferred
                                                      </span>
                                                    )}
                                                  </p>
                                                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary/70">Volunteer</p>
                                                </div>
                                              </div>
                                              <div className="shrink-0 pl-1 text-right">
                                                {hasRating ? renderRatingSummary(v.rating) : <span className="text-[10px] text-muted-foreground sm:text-xs">Not rated</span>}
                                              </div>
                                            </div>
                                            <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                                              {(v.bio || `Experienced in ${Array.isArray(v.services) ? v.services.slice(0, 2).join(" and ") : "care"} services.`).toString()}
                                            </p>
                                            <div className="mb-3 flex flex-wrap gap-1.5">
                                              {normalizeServiceLabels(v.services || [])
                                                .slice(0, 3)
                                                .map((s: string) => (
                                                  <Badge key={s} variant="outline" className="max-w-full truncate capitalize text-xs">
                                                    {s.replace("_", " ")}
                                                  </Badge>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b pb-4 text-[11px] text-muted-foreground sm:text-xs">
                                              <div className="flex shrink-0 items-center gap-1">
                                                <BarChart3 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                                <span className="whitespace-nowrap">{tasks} tasks</span>
                                              </div>
                                              <span className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50 sm:inline-block" aria-hidden />
                                              <div className="min-w-0 flex-1 basis-[8rem] leading-snug">
                                                <span className="font-medium text-foreground">{matchPct}% match</span>
                                                <span className="text-muted-foreground"> · </span>
                                                <span className="break-words">{matchLabels}</span>
                                              </div>
                                              <div className="ml-auto flex shrink-0 justify-end">
                                                {declined ? (
                                                  <Badge variant="destructive" className="max-w-[9rem] truncate px-2 py-0.5 text-[10px] font-medium sm:max-w-none sm:text-xs">
                                                    Declined
                                                  </Badge>
                                                ) : onLeave ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="max-w-[9rem] truncate border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100 sm:max-w-none sm:text-xs"
                                                  >
                                                    On leave
                                                  </Badge>
                                                ) : available ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="max-w-[9rem] truncate border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 sm:max-w-none sm:text-xs"
                                                  >
                                                    Available
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="destructive" className="max-w-[9rem] truncate px-2 py-0.5 text-[10px] font-medium sm:max-w-none sm:text-xs">
                                                    Schedule conflict
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex cursor-default items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 select-auto sm:px-5">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <button type="button" className="shrink-0 text-left text-xs font-medium text-primary hover:underline sm:text-sm">
                                                  Read more
                                                </button>
                                              </DialogTrigger>
                                              <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                  <DialogTitle>{v.fullName}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 text-sm text-muted-foreground">
                                                  <div className="flex items-center gap-3">
                                                    <VolunteerAvatar profilePhotoUrl={v.profilePhotoUrl} name={v.fullName} size="lg" />
                                                    <span>{v.email || "Email not provided"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Phone:</span>
                                                    <span>{v.phone || "Phone not provided"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Rating:</span>
                                                    <span>{hasRating ? `${v.rating.toFixed(1)} / 5` : "Not yet rated"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">Tasks completed:</span>
                                                    <span>{tasks}</span>
                                                  </div>
                                                  <div>
                                                    <p className="mb-1 font-medium text-foreground">Services</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {normalizeServiceLabels(v.services || []).map((s: string) => (
                                                        <Badge key={s} variant="secondary" className="capitalize">
                                                          {s.replace("_", " ")}
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div
                                                    className={`font-medium ${declined ? "text-destructive" : available ? "text-emerald-600" : onLeave ? "text-amber-700 dark:text-amber-400" : "text-destructive"}`}
                                                  >
                                                    Availability:{" "}
                                                    {declined
                                                      ? "Unavailable (declined)"
                                                      : onLeave
                                                        ? "On leave (time off)"
                                                        : available
                                                          ? "Available"
                                                          : "Schedule conflict at selected time"}
                                                  </div>
                                                  {v.bio && (
                                                    <div>
                                                      <p className="mb-1 font-medium text-foreground">About</p>
                                                      <p>{v.bio}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                            <Button
                                              className="shrink-0 px-3 text-xs sm:px-4 sm:text-sm"
                                              onClick={() => handleAssign(request.id, v)}
                                              disabled={!canAssign}
                                              aria-disabled={!canAssign}
                                              variant={canAssign ? "default" : "secondary"}
                                            >
                                              {assignButtonLabel}
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-2 top-1/2 z-10 -translate-y-1/2 border bg-background/90 shadow" />
                            <CarouselNext className="right-2 top-1/2 z-10 -translate-y-1/2 border bg-background/90 shadow" />
                          </Carousel>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
                  );
                })}
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

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the service request and all related data (assignments, notifications, ratings). This action cannot be undone.
                {deleteTarget && (
                  <span className="block mt-2 font-medium text-foreground">
                    Deleting: {deleteTarget.elderName} – {Array.isArray(deleteTarget.services) ? deleteTarget.services.join(", ") : deleteTarget.service}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  if (deleteTarget && !deletingId) handleDeleteRequest(deleteTarget.id);
                }}
                disabled={!!deletingId}
              >
                {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default ServiceRequests;
