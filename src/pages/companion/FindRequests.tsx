import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { CompanionNavbar } from "@/components/companion/CompanionNavbar";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  updateDoc,
  addDoc,
  deleteField,
  arrayUnion,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Inbox,
  Loader2,
  ClipboardList,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getDynamicAdjustment,
  genConfirmation,
  hasOverlap,
  SERVICE_RATES,
  toMinutes,
} from "@/lib/assignmentHelpers";
import { deletePendingServiceRequestNotifications } from "@/lib/guardian-notifications";
import { getAssignmentServiceDayMs, isDayCoveredByLeave, parseLeaveDoc } from "@/lib/volunteer-leave";

/** Trimmed reason must be at least this many characters before a volunteer can decline. */
const MIN_DECLINE_REASON_LENGTH = 25;

const FindRequests = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [myLeavePeriods, setMyLeavePeriods] = useState<Array<{ startDayMs: number; endDayMs: number }>>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineTarget, setDeclineTarget] = useState<any | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => {
      setEmail(p?.email?.toLowerCase?.() ?? null);
    });
    return () => unsub();
  }, []);

  // Volunteer's pendingVolunteers profile (must be approved)
  useEffect(() => {
    if (!email) {
      setVolunteerProfile(null);
      return;
    }
    const q = query(
      collection(db, "pendingVolunteers"),
      where("email", "==", email),
      where("status", "==", "approved"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setVolunteerProfile(null);
      } else {
        const d = snap.docs[0];
        setVolunteerProfile({ id: d.id, ...(d.data() as any) });
      }
    });
    return () => unsub();
  }, [email]);

  // All pending requests - filter client-side by preferredVolunteerEmail
  useEffect(() => {
    const q = query(
      collection(db, "serviceRequests"),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRequests(all);
    });
    return () => unsub();
  }, []);

  // Ratings aggregation
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const sums: Record<string, { sum: number; count: number }> = {};
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const em = (r.volunteerEmail || "").toLowerCase();
        const v = Number(r.rating) || 0;
        if (!em || v <= 0) return;
        if (!sums[em]) sums[em] = { sum: 0, count: 0 };
        sums[em].sum += v;
        sums[em].count += 1;
      });
      const avg: Record<string, { avg: number; count: number }> = {};
      Object.keys(sums).forEach((em) => {
        const { sum, count } = sums[em];
        avg[em] = { avg: sum / count, count };
      });
      setRatingsMap(avg);
    });
    return () => unsub();
  }, []);

  // Tasks completed (from assignments) and my assignments for conflict check
  useEffect(() => {
    if (!email) {
      setTasksMap({});
      setMyAssignments([]);
      return;
    }
    const q = query(
      collection(db, "assignments"),
      where("volunteerEmail", "==", email)
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMyAssignments(arr);
      const counts: Record<string, number> = {};
      arr.forEach((a) => {
        const isDone = a.status === "completed" && a.guardianConfirmed === true;
        if (isDone) counts[email] = (counts[email] || 0) + 1;
      });
      setTasksMap(counts);
    });
    return () => unsub();
  }, [email]);

  useEffect(() => {
    if (!email) {
      setMyLeavePeriods([]);
      return;
    }
    const q = query(collection(db, "volunteerLeave"), where("volunteerEmail", "==", email));
    const unsub = onSnapshot(q, (snap) => {
      const rows: Array<{ startDayMs: number; endDayMs: number }> = [];
      snap.docs.forEach((d) => {
        const p = parseLeaveDoc(d.id, d.data() as Record<string, unknown>);
        if (p) rows.push({ startDayMs: p.startDayMs, endDayMs: p.endDayMs });
      });
      setMyLeavePeriods(rows);
    });
    return () => unsub();
  }, [email]);

  const emailKey = email || "";
  const volunteer = volunteerProfile
    ? {
        id: volunteerProfile.id,
        email: volunteerProfile.email || email,
        fullName: volunteerProfile.fullName || volunteerProfile.email || email,
      }
    : null;

  // Guardian-requested: pending requests where I'm the preferred volunteer and I haven't declined
  const preferredRequests =
    requests && email
      ? requests.filter((r) => {
          const pref = (r.preferredVolunteerEmail || "").toLowerCase().trim();
          if (pref !== emailKey) return false;
          const declinedBy = (r.preferredVolunteerDeclinedBy || []) as string[];
          if (declinedBy.some((e: string) => (e || "").toLowerCase() === emailKey)) return false;
          return true;
        })
      : [];

  // Admin-assigned: assignments where I was assigned but haven't accepted yet
  const adminAssignedRequests = React.useMemo(() => {
    return (myAssignments || []).filter(
      (a) => a.status === "assigned" && !a.acceptedByVolunteer
    );
  }, [myAssignments]);

  // Unified list for display: guardian requests + admin-assigned (from assignment data)
  const allActionableRequests = React.useMemo(() => {
    const getCreatedMs = (r: any) => {
      const t = r.createdAt;
      return typeof t === "number" ? t : (t?.toMillis?.() ?? 0);
    };
    const fromGuardian = preferredRequests.map((r) => ({
      type: "guardian" as const,
      id: r.id,
      requestId: r.id,
      assignmentId: null as string | null,
      elderName: r.elderName,
      services: Array.isArray(r.services) ? r.services : r.service ? [r.service] : [],
      serviceDateDisplay: r.serviceDateDisplay,
      serviceDateTS: r.serviceDateTS,
      startTime24: r.startTime24,
      endTime24: r.endTime24,
      startTimeText: r.startTimeText,
      endTimeText: r.endTimeText,
      address: r.address,
      notes: r.notes,
      userId: r.userId,
      request: r,
      sortKey: getCreatedMs(r),
    }));
    const fromAdmin = adminAssignedRequests.map((a) => {
      const ts = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
      return {
      type: "admin" as const,
      id: a.id,
      requestId: a.requestId,
      assignmentId: a.id,
      elderName: a.elderName,
      services: Array.isArray(a.services) ? a.services : [a.services],
      serviceDateDisplay: ts ? new Date(ts).toLocaleDateString("en-US", { dateStyle: "long" }) : "",
      serviceDateTS: ts,
      startTime24: a.startTime24,
      endTime24: a.endTime24,
      startTimeText: a.startTimeText,
      endTimeText: a.endTimeText,
      address: a.address,
      notes: a.notes,
      userId: a.elderUserId,
      assignment: a,
      sortKey: getCreatedMs(a),
    };
    });
    const combined = [...fromGuardian, ...fromAdmin];
    const mult = sortOrder === "newest" ? -1 : 1;
    return combined.sort((a, b) => mult * ((a.sortKey ?? 0) - (b.sortKey ?? 0)));
  }, [preferredRequests, adminAssignedRequests, sortOrder]);

  const isVolunteerOnLeave = (item: { serviceDateTS?: unknown }): boolean => {
    const day = getAssignmentServiceDayMs({ serviceDateTS: item.serviceDateTS as number | { toMillis?: () => number } | undefined });
    if (!day) return false;
    return isDayCoveredByLeave(day, myLeavePeriods);
  };

  const isVolunteerBusy = (
    item: { serviceDateTS?: unknown; startTime24?: string; endTime24?: string; assignmentId?: string | null },
    excludeAssignmentId?: string | null
  ): boolean => {
    if (!item || !email) return false;
    const day = getAssignmentServiceDayMs({ serviceDateTS: item.serviceDateTS as number | { toMillis?: () => number } | undefined });
    const s = toMinutes(item.startTime24);
    const e = toMinutes(item.endTime24);
    if (!day || s == null || e == null) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dayMs = todayStart.getTime();
    return myAssignments.some((a) => {
      if (a.status === "cancelled" || a.status === "declined") return false;
      if (!a.acceptedByVolunteer) return false;
      if (excludeAssignmentId && a.id === excludeAssignmentId) return false;
      const aDay = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
      if (aDay < dayMs) return false;
      if (aDay !== day) return false;
      const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
      const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
      const bs = sh * 60 + (sm || 0);
      const be = eh * 60 + (em || 0);
      return hasOverlap(s, e, bs, be);
    });
  };

  const handleAccept = async (item: (typeof allActionableRequests)[0]) => {
    if (!volunteer || !email) {
      toast({ title: "Not eligible", description: "Only approved volunteers can accept requests.", variant: "destructive" });
      return;
    }
    if (isVolunteerOnLeave(item)) {
      toast({
        title: "You are on leave",
        description: "This date falls in your time off. Remove or adjust time off under Time off if you need to accept this request.",
        variant: "destructive",
      });
      return;
    }
    if (isVolunteerBusy(item, item.assignmentId)) {
      toast({ title: "Schedule conflict", description: "You have another assignment at that time.", variant: "destructive" });
      return;
    }

    setAcceptingId(item.id);
    try {
      if (item.type === "admin") {
        await updateDoc(doc(db, "assignments", item.assignmentId!), {
          acceptedByVolunteer: true,
          acceptedByVolunteerAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (item.requestId) await deletePendingServiceRequestNotifications(db, item.requestId);
        toast({ title: "Request accepted", description: "It will appear in My Assignments." });
      } else {
        const req = item.request!;
        const reqRef = doc(db, "serviceRequests", item.requestId);
        const assignmentRef = doc(collection(db, "assignments"));

        let volunteerUid: string | null = null;
        try {
          if (volunteer.email) {
            const uQ = query(collection(db, "users"), where("email", "==", volunteer.email), limit(1));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) volunteerUid = uSnap.docs[0].id;
          }
        } catch {}

        const ratingAgg = ratingsMap[emailKey];
        const tasksDone = tasksMap[emailKey] ?? 0;
        const { tier, percent } = getDynamicAdjustment(tasksDone, ratingAgg?.avg);
        const demand = { tier: "Normal" as const, percent: 0, ratio: 0 };

        const perServiceHoursByName: Record<string, number> =
          req.perServiceHoursByName && typeof req.perServiceHoursByName === "object"
            ? req.perServiceHoursByName
            : {};
        const selectedServices: string[] = Array.isArray(req.services) ? req.services : req.service ? [req.service] : [];
        const lineItems = selectedServices
          .map((name: string) => {
            const baseRate = SERVICE_RATES[name] ?? 0;
            const hours = Math.max(0, Number(perServiceHoursByName?.[name] ?? 0));
            const adjustedRate = baseRate * (1 + percent);
            const amount = adjustedRate * hours;
            return { name, baseRate, hours, adjustedRate, amount };
          })
          .filter((li: any) => li.hours > 0);
        const subtotal = lineItems.reduce((s: number, li: any) => s + li.amount, 0);
        const commission = subtotal * 0.05;
        const total = subtotal + commission;
        const confirmationNumber = genConfirmation();

        const assignmentPayload = {
          requestId: item.requestId,
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
            dynamicPricing: { tier, percent, components: { performance: { tier, percent }, demand } },
          },
          receiptIssuedAt: serverTimestamp(),
          status: "assigned",
          acceptedByVolunteer: true,
          acceptedByVolunteerAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await runTransaction(db, async (transaction) => {
          const reqSnap = await transaction.get(reqRef);
          if (!reqSnap.exists()) throw new Error("Request not found");
          const data = reqSnap.data() as any;
          if ((data.status || "").toLowerCase() !== "pending") throw new Error("This request was already assigned.");
          transaction.update(reqRef, {
            status: "assigned",
            assignedTo: volunteer.fullName,
            acceptedByVolunteer: true,
            acceptedByVolunteerAt: serverTimestamp(),
            assignedAt: serverTimestamp(),
          });
          transaction.set(assignmentRef, assignmentPayload);
        });
        await deletePendingServiceRequestNotifications(db, item.requestId);
        toast({ title: "Request accepted", description: "It will appear in My Assignments." });
      }
    } catch (e: any) {
      toast({ title: "Could not accept", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAcceptingId(null);
    }
  };

  const trimmedDeclineReasonLen = declineReason.trim().length;
  const declineReasonMeetsMin = trimmedDeclineReasonLen >= MIN_DECLINE_REASON_LENGTH;
  const isDecliningCurrentTarget = Boolean(declineTarget && decliningId === declineTarget.id);

  const handleDecline = async () => {
    if (!declineTarget || !volunteer) return;
    const reason = declineReason.trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Please provide a reason for declining.", variant: "destructive" });
      return;
    }
    if (reason.length < MIN_DECLINE_REASON_LENGTH) {
      toast({
        title: "Reason too short",
        description: `Please write at least ${MIN_DECLINE_REASON_LENGTH} characters (${MIN_DECLINE_REASON_LENGTH - reason.length} more) so the guardian and admin can understand.`,
        variant: "destructive",
      });
      return;
    }
    setDecliningId(declineTarget.id);
    try {
      const createNotification = (recipientUid: string, title: string, body: string) =>
        addDoc(collection(db, "notifications"), {
          recipientUid,
          type: "volunteer_declined",
          title,
          body,
          declineReason: reason,
          requestId: declineTarget.requestId || null,
          assignmentId: declineTarget.assignmentId || null,
          volunteerName: volunteer.fullName,
          elderName: declineTarget.elderName || null,
          createdAt: serverTimestamp(),
          read: false,
        });

      if (declineTarget.type === "guardian") {
        await updateDoc(doc(db, "serviceRequests", declineTarget.requestId), {
          preferredVolunteerDeclinedBy: arrayUnion(email),
          preferredVolunteerDeclineReason: reason,
          preferredVolunteerDeclinedAt: serverTimestamp(),
        });
        if (declineTarget.userId) {
          await createNotification(
            declineTarget.userId,
            "Volunteer declined your request",
            `${volunteer.fullName} is unable to take your requested service. Your request remains open for another volunteer.`
          );
        }
      } else {
        await updateDoc(doc(db, "assignments", declineTarget.assignmentId), {
          status: "declined",
          declineReason: reason,
          declinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (declineTarget.requestId) {
          await updateDoc(doc(db, "serviceRequests", declineTarget.requestId), {
            status: "pending",
            assignedTo: deleteField(),
            acceptedByVolunteer: deleteField(),
            acceptedByVolunteerAt: deleteField(),
            assignedAt: deleteField(),
            adminAssignedDeclinedBy: arrayUnion(email),
          });
        }
        if (declineTarget.userId) {
          await createNotification(
            declineTarget.userId,
            "Volunteer declined your request",
            `${volunteer.fullName} is unable to take your requested service. Your request has been reverted to pending.`
          );
        }
      }
      setDeclineTarget(null);
      setDeclineReason("");
      toast({ title: "Request declined", description: "Relevant parties have been notified." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not decline", description: e?.message ?? "Please try again." });
    } finally {
      setDecliningId(null);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <CompanionNavbar />
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <p className="text-muted-foreground">Please log in to view requests.</p>
        </main>
      </div>
    );
  }

  if (!volunteerProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <CompanionNavbar />
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <p className="text-muted-foreground">Only approved volunteers can see and accept requests. Your profile may still be under review.</p>
          <Link to="/companion">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Find Requests</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Service requests for you—from guardians who chose you or assigned by admin. Accept or decline each request.
        </p>

        {allActionableRequests.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <div className="flex rounded-lg border bg-muted/50 p-0.5">
              {(["newest", "oldest"] as const).map((order) => (
                <button
                  key={order}
                  type="button"
                  onClick={() => setSortOrder(order)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    sortOrder === order
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {order === "newest" ? "Newest first" : "Oldest first"}
                </button>
              ))}
            </div>
          </div>
        )}

        {requests === null ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : allActionableRequests.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No requests for you right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              When a guardian selects you or admin assigns you to a request, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allActionableRequests.map((item) => {
              const onLeave = isVolunteerOnLeave(item);
              const busy = isVolunteerBusy(item, item.assignmentId);
              const blockAccept = onLeave || busy;
              const isProcessing = acceptingId === item.id || decliningId === item.id;
              return (
                <Card key={item.id} className="border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{item.elderName}</CardTitle>
                      {item.type === "guardian" && <Badge variant="secondary">Preferred by guardian</Badge>}
                      {item.type === "admin" && <Badge variant="outline">Assigned by admin</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Array.isArray(item.services) ? item.services.join(", ") : item.services}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{item.serviceDateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{item.startTimeText} – {item.endTimeText}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{item.address || "—"}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {item.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={blockAccept || isProcessing}
                        onClick={() => handleAccept(item)}
                      >
                        {acceptingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {onLeave ? "On leave" : busy ? "Conflicting schedule" : acceptingId === item.id ? "Accepting…" : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        disabled={isProcessing}
                        onClick={() => { setDeclineTarget(item); setDeclineReason(""); }}
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </Button>
                      {onLeave && (
                        <Badge variant="secondary">You marked this day as time off</Badge>
                      )}
                      {!onLeave && busy && (
                        <Badge variant="secondary">You have another assignment at this time</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!declineTarget} onOpenChange={(open) => { if (!open) { setDeclineTarget(null); setDeclineReason(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Decline Request</DialogTitle>
              <DialogDescription>
                Provide a clear reason ({MIN_DECLINE_REASON_LENGTH} characters minimum). It will be shared with the admin
                {declineTarget?.type === "guardian" ? " and guardian" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Please explain why you are declining. Your reason will be shared with the admin
                {declineTarget?.type === "guardian" ? " and the guardian who requested you" : ""}.
              </p>
              <textarea
                className={cn(
                  "w-full rounded-md border p-3 text-sm min-h-[100px]",
                  trimmedDeclineReasonLen > 0 && !declineReasonMeetsMin && "border-amber-500/60 focus-visible:ring-amber-500/30"
                )}
                placeholder="e.g., I have a scheduling conflict that day, or another commitment during that time window."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                aria-invalid={trimmedDeclineReasonLen > 0 && !declineReasonMeetsMin}
              />
              <p className="text-xs text-muted-foreground">
                {declineReasonMeetsMin ? (
                  <span>{trimmedDeclineReasonLen} characters</span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-500/90">
                    {MIN_DECLINE_REASON_LENGTH} minimum characters
                    {trimmedDeclineReasonLen > 0
                      ? ` — ${MIN_DECLINE_REASON_LENGTH - trimmedDeclineReasonLen} more needed`
                      : ""}
                  </span>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDeclineTarget(null); setDeclineReason(""); }}>Cancel</Button>
                <Button variant="destructive" onClick={handleDecline} disabled={!declineReasonMeetsMin || isDecliningCurrentTarget}>
                  {isDecliningCurrentTarget ? "Declining…" : "Decline"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default FindRequests;
