import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
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
} from "firebase/firestore";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  getDynamicAdjustment,
  genConfirmation,
  hasOverlap,
  SERVICE_RATES,
  toMinutes,
} from "@/lib/assignmentHelpers";

const CompanionNavbar = () => {
  const user = getCurrentUser();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/companion" className="flex items-center gap-2" aria-label="ElderEase Companion Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase Companion</span>
        </Link>
        <div className="hidden md:flex items-center gap-5">
          <Link to="/companion" className={isActive("/companion") ? "font-semibold underline underline-offset-8" : "opacity-90 hover:opacity-100"}>Dashboard</Link>
          <Link to="/companion/assignments" className={isActive("/companion/assignments") ? "font-semibold underline underline-offset-8" : "opacity-90 hover:opacity-100"}>My Assignments</Link>
          <Link to="/companion/requests" className={isActive("/companion/requests") ? "font-semibold underline underline-offset-8" : "opacity-90 hover:opacity-100"}>Find Requests</Link>
          <Link to="/companion/activity" className={isActive("/companion/activity") ? "font-semibold underline underline-offset-8" : "opacity-90 hover:opacity-100"}>Activity Log</Link>
          <Link to="/companion/profile" className="opacity-90 hover:opacity-100">Profile</Link>
          {user ? (
            <Button variant="nav" size="sm" onClick={() => { logout(); window.location.href = "/"; }}>
              Logout
            </Button>
          ) : (
            <Link to="/login"><Button variant="nav" size="sm">Login</Button></Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const FindRequests = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

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

  const emailKey = email || "";
  const volunteer = volunteerProfile
    ? {
        id: volunteerProfile.id,
        email: volunteerProfile.email || email,
        fullName: volunteerProfile.fullName || volunteerProfile.email || email,
      }
    : null;

  const preferredRequests =
    requests && email
      ? requests.filter((r) => {
          const pref = (r.preferredVolunteerEmail || "").toLowerCase().trim();
          return pref === emailKey;
        })
      : [];

  const isVolunteerBusy = (req: any): boolean => {
    if (!req || !email) return false;
    const day = Number(req.serviceDateTS);
    const s = toMinutes(req.startTime24);
    const e = toMinutes(req.endTime24);
    if (!Number.isFinite(day) || s == null || e == null) return false;
    return myAssignments.some((a) => {
      if (a.status === "cancelled") return false;
      if (Number(a.serviceDateTS) !== day) return false;
      const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
      const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
      const bs = sh * 60 + (sm || 0);
      const be = eh * 60 + (em || 0);
      return hasOverlap(s, e, bs, be);
    });
  };

  const handleAccept = async (requestId: string) => {
    if (!volunteer || !email) {
      toast({ title: "Not eligible", description: "Only approved volunteers can accept requests.", variant: "destructive" });
      return;
    }
    const req = preferredRequests.find((r) => r.id === requestId);
    if (!req) {
      toast({ title: "Request not found", variant: "destructive" });
      return;
    }
    if (isVolunteerBusy(req)) {
      toast({ title: "Schedule conflict", description: "You have another assignment at that time.", variant: "destructive" });
      return;
    }

    setAcceptingId(requestId);
    try {
      let volunteerUid: string | null = null;
      try {
        if (volunteer.email) {
          const uQ = query(collection(db, "users"), where("email", "==", volunteer.email), limit(1));
          const uSnap = await getDocs(uQ);
          if (!uSnap.empty) volunteerUid = uSnap.docs[0].id;
        }
      } catch {}

      const reqRef = doc(db, "serviceRequests", requestId);
      const assignmentRef = doc(collection(db, "assignments"));

      const ratingAgg = ratingsMap[emailKey];
      const tasksDone = tasksMap[emailKey] ?? 0;
      const { tier, percent } = getDynamicAdjustment(tasksDone, ratingAgg?.avg);
      const demand = { tier: "Normal" as const, percent: 0, ratio: 0 };

      const perServiceHoursByName: Record<string, number> =
        req.perServiceHoursByName && typeof req.perServiceHoursByName === "object"
          ? req.perServiceHoursByName
          : {};
      const selectedServices: string[] = Array.isArray(req.services)
        ? req.services
        : req.service
          ? [req.service]
          : [];
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
            tier,
            percent,
            components: {
              performance: { tier, percent },
              demand,
            },
          },
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
        if (!reqSnap.exists()) {
          throw new Error("Request not found");
        }
        const data = reqSnap.data() as any;
        if ((data.status || "").toLowerCase() !== "pending") {
          throw new Error("This request was already assigned.");
        }

        transaction.update(reqRef, {
          status: "assigned",
          assignedTo: volunteer.fullName,
          acceptedByVolunteer: true,
          acceptedByVolunteerAt: serverTimestamp(),
          assignedAt: serverTimestamp(),
        });
        transaction.set(assignmentRef, assignmentPayload);
      });

      toast({
        title: "Request accepted",
        description: `You've been assigned. It will appear in My Assignments.`,
      });
    } catch (e: any) {
      const msg = e?.message ?? "Please try again.";
      toast({
        title: "Could not accept",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setAcceptingId(null);
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
          Requests where the guardian chose you as their preferred volunteer. Accept a request to be assigned.
        </p>

        {requests === null ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : preferredRequests.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No requests for you right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              When a guardian selects you as their preferred volunteer, the request will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {preferredRequests.map((req) => {
              const busy = isVolunteerBusy(req);
              return (
                <Card key={req.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{req.elderName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {Array.isArray(req.services) ? req.services.join(", ") : req.service}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{req.serviceDateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{req.startTimeText} – {req.endTimeText}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{req.address || "—"}</span>
                    </div>
                    {req.notes && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {req.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={busy || acceptingId === req.id}
                        onClick={() => handleAccept(req.id)}
                      >
                        {acceptingId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {busy ? "Conflicting schedule" : acceptingId === req.id ? "Accepting…" : "Accept request"}
                      </Button>
                      {busy && (
                        <Badge variant="secondary">You have another assignment at this time</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default FindRequests;
