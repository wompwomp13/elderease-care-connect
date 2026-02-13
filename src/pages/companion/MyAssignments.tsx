import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Phone, User, Clock, HeartHandshake, ShoppingBasket, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where, updateDoc, doc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button as UIButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
        <div className="hidden md:flex items-center gap-5" role="navigation" aria-label="Primary">
          <Link to="/companion" className={`transition-opacity ${isActive("/companion") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Dashboard</Link>
          <Link to="/companion/assignments" className={`transition-opacity ${isActive("/companion/assignments") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>My Assignments</Link>
          
          <Link to="/companion/activity" className={`transition-opacity ${isActive("/companion/activity") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`} tabIndex={0}>Activity Log</Link>
          <Link to="/companion/profile" className="hover:opacity-80 transition-opacity" tabIndex={0}>Profile</Link>
          {user ? (
            <Button variant="nav" size="sm" onClick={() => { logout(); window.location.href = "/"; }} aria-label="Log out">Logout</Button>
          ) : (
            <Link to="/login">
              <Button variant="nav" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const MyAssignments = () => {
  const user = getCurrentUser();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [ratingTarget, setRatingTarget] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(user?.email ?? null);
  const [detailsTarget, setDetailsTarget] = useState<any | null>(null);
  const [requestNotes, setRequestNotes] = useState<string | null>(null);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [justCompletedById, setJustCompletedById] = useState<Record<string, boolean>>({});
  const [dayFilterEnabled, setDayFilterEnabled] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState<number>(1);
  const perPage = 5;
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => setCurrentEmail(p?.email?.toLowerCase() ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentEmail) {
      setAssignments([]);
      return;
    }
    const q = query(collection(db, "assignments"), where("volunteerEmail", "==", currentEmail));
    const unsub = onSnapshot(
      q,
      (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => setAssignments([]),
    );
    return () => unsub();
  }, [currentEmail]);

  const markCompleted = async (assignment: any) => {
    if (!assignment?.id) return;
    if (assignment.status === "completed" || assignment.awaitingGuardianConfirm) return;
    setUpdatingById((s) => ({ ...s, [assignment.id]: true }));
    setJustCompletedById((s) => ({ ...s, [assignment.id]: true }));
    try {
      await updateDoc(doc(db, "assignments", assignment.id), {
        status: "completed",
        awaitingGuardianConfirm: true,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Marked as completed",
        description: "Waiting for guardian confirmation.",
      });
    } catch (err: any) {
      setJustCompletedById((s) => ({ ...s, [assignment.id]: false }));
      toast({
        variant: "destructive",
        title: "Could not mark completed",
        description: err?.message || "Please try again.",
      });
    } finally {
      setUpdatingById((s) => ({ ...s, [assignment.id]: false }));
    }
  };

  // When opening details, if assignment lacks notes, fetch notes from the related service request
  useEffect(() => {
    setRequestNotes(null);
    const rid = detailsTarget?.requestId;
    const hasNotes = Boolean(detailsTarget?.notes);
    if (!rid || hasNotes) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "serviceRequests", rid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setRequestNotes(data?.notes ?? null);
        }
      } catch {}
    })();
  }, [detailsTarget]);

  const requestRating = (assignment: any) => {
    setRatingTarget(assignment);
  };

  const submitRating = async () => {
    if (!ratingTarget) return;
    await addDoc(collection(db, "ratings"), {
      assignmentId: ratingTarget.id,
      volunteerEmail: ratingTarget.volunteerEmail,
      volunteerName: ratingTarget.volunteerName,
      elderUserId: ratingTarget.elderUserId || null,
      rating: ratingValue,
      feedback: ratingFeedback || null,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "assignments", ratingTarget.id), { rated: true, updatedAt: serverTimestamp() });
    setRatingTarget(null);
    setRatingValue(5);
    setRatingFeedback("");
  };

  const durationFromAssignment = (a: any) => {
    const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
    const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (!isFinite(mins) || mins <= 0) return "—";
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
  };

  // Filter by selected day (only when a day is chosen)
  const filteredAssignments = useMemo(() => {
    const list = assignments || [];
    if (!dayFilterEnabled || !selectedDate) return list;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    const startMs = start.getTime();
    const endMs = end.getTime();
    return list.filter((a) => {
      const ts = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
      return ts >= startMs && ts <= endMs;
    });
  }, [assignments, selectedDate, dayFilterEnabled]);

  // Get assignment "order" timestamp (createdAt or serviceDateTS fallback)
  const getOrderMs = (a: any) => {
    const ts = a.createdAt;
    const createdMs = ts ? (typeof ts === "number" ? ts : ts?.toMillis?.() ?? 0) : 0;
    const serviceMs = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
    return createdMs || serviceMs;
  };

  // Sort: incomplete first, then by newest/oldest (createdAt)
  const sortedAssignments = useMemo(() => {
    const toMinutes = (t?: string | null) => {
      if (!t) return 0;
      const [h, m] = String(t).split(":").map((x: string) => parseInt(x || "0", 10));
      return (h * 60 + (m || 0)) | 0;
    };
    const mult = sortOrder === "newest" ? -1 : 1;
    return [...filteredAssignments].sort((a, b) => {
      const aCompleted = a.status === "completed";
      const bCompleted = b.status === "completed";
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      const aOrder = getOrderMs(a);
      const bOrder = getOrderMs(b);
      if (aOrder !== bOrder) return mult * (aOrder - bOrder);
      const aDate = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
      const bDate = typeof b.serviceDateTS === "number" ? b.serviceDateTS : (b.serviceDateTS?.toMillis?.() ?? 0);
      if (aDate !== bDate) return mult * (aDate - bDate);
      return mult * (toMinutes(a.startTime24) - toMinutes(b.startTime24));
    });
  }, [filteredAssignments, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedAssignments.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return sortedAssignments.slice(start, start + perPage);
  }, [sortedAssignments, safePage]);
  useEffect(() => { setPage(1); }, [dayFilterEnabled, selectedDate, assignments?.length, sortOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Organic blobs */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-[40%] bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-10 h-72 w-72 rounded-[45%] bg-blue-500/10 blur-3xl" />

      <CompanionNavbar />

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">My Assignments</h1>
              <p className="text-muted-foreground">A friendly overview of your upcoming visits and tasks.</p>
            </div>
            <div className="flex rounded-lg border bg-muted/50 p-0.5 shrink-0">
              {(["newest", "oldest"] as const).map((order) => (
                <button
                  key={order}
                  type="button"
                  onClick={() => setSortOrder(order)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    sortOrder === order
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {order === "newest" ? "Newest first" : "Oldest first"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: assignments cards (from Firestore) */}
          <div className="lg:col-span-2 space-y-5">
            {assignments === null ? (
              <div className="p-6 text-muted-foreground">Loading assignments…</div>
            ) : sortedAssignments.length === 0 ? (
              <div className="p-6 text-muted-foreground">No assignments yet.</div>
            ) : (
              <>
                {pageItems.map((a) => (
                  <div key={a.id} className="rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
                          <HeartHandshake className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {(() => {
                              const ms = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
                              return ms ? format(ms, "EEE, MMM d, yyyy") : "—";
                            })()}
                            {" • "}
                            {a.startTimeText} – {a.endTimeText}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> {a.address || "—"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailsTarget(a)}>View Details</Button>
                        {(() => {
                          const isCompleted = Boolean(a?.status === "completed" || a?.awaitingGuardianConfirm || justCompletedById[a.id]);
                          const isLoading = Boolean(updatingById[a.id]);
                          if (isCompleted) {
                            return (
                              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-600 text-white" disabled>
                                <CheckCircle2 className="h-4 w-4" /> Completed
                              </Button>
                            );
                          }
                          return (
                            <Button size="sm" className="gap-2" onClick={() => markCompleted(a)} disabled={isLoading} aria-busy={isLoading}>
                              <CheckCircle2 className="h-4 w-4" /> {isLoading ? "Saving…" : "Mark Completed"}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
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
            )}
          </div>

          {/* Right: schedule */}
          <div className="space-y-5">
            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Weekly Calendar</h2>
                <div className="flex items-center gap-3">
                  {dayFilterEnabled && (
                    <button
                      className="text-xs underline text-muted-foreground hover:text-foreground"
                      onClick={() => { setDayFilterEnabled(false); }}
                    >
                      Show all days
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">Plan ahead</span>
                </div>
              </div>
              <div className="flex justify-center">
                <DateCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d: Date | undefined) => { setSelectedDate(d); if (d) setDayFilterEnabled(true); }}
                  className="rounded-xl border"
                />
              </div>
            </div>

            
          </div>
        </div>
      </main>

      {/* Rating Dialog */}
      <Dialog open={!!ratingTarget} onOpenChange={(open) => { if (!open) setRatingTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">How was your service with <span className="font-medium">{ratingTarget?.volunteerName}</span>?</p>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((n) => (
                <UIButton key={n} variant={n <= ratingValue ? "default" : "outline"} size="icon" onClick={() => setRatingValue(n)} aria-label={`Rate ${n}`}>
                  {n}
                </UIButton>
              ))}
            </div>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={3} placeholder="What did you like or what could be improved?" value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} />
            <div className="flex justify-end gap-2">
              <UIButton variant="outline" onClick={() => setRatingTarget(null)}>Cancel</UIButton>
              <UIButton onClick={submitRating}>Submit</UIButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!detailsTarget} onOpenChange={(open) => { if (!open) setDetailsTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Guardian/Elder</span>
              <span className="font-medium">{detailsTarget?.elderName || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Services</span>
              <span className="font-medium">{Array.isArray(detailsTarget?.services) ? detailsTarget?.services.join(", ") : (detailsTarget?.services || "—")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date & Time</span>
              <span className="font-medium">{detailsTarget?.serviceDateTS ? new Date(detailsTarget.serviceDateTS).toLocaleDateString() : "—"} • {detailsTarget?.startTimeText} - {detailsTarget?.endTimeText}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{detailsTarget ? durationFromAssignment(detailsTarget) : "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right">{detailsTarget?.address || "—"}</span>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Notes</p>
              <p className="font-medium whitespace-pre-wrap">{detailsTarget?.notes ?? requestNotes ?? "No additional notes provided."}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssignments;


