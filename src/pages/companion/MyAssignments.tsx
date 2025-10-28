import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Phone, User, Clock, HeartHandshake, ShoppingBasket, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button as UIButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [justCompletedById, setJustCompletedById] = useState<Record<string, boolean>>({});
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Organic blobs */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-[40%] bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-10 h-72 w-72 rounded-[45%] bg-blue-500/10 blur-3xl" />

      <CompanionNavbar />

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">My Assignments</h1>
          <p className="text-muted-foreground">A friendly overview of your upcoming visits and tasks.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: assignments cards (from Firestore) */}
          <div className="lg:col-span-2 space-y-5">
            {assignments === null ? (
              <div className="p-6 text-muted-foreground">Loading assignments…</div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-muted-foreground">No assignments yet.</div>
            ) : assignments.map((a) => (
              <div key={a.id} className="rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
                      <HeartHandshake className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> {a.startTimeText} • {a.endTimeText}</p>
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
          </div>

          {/* Right: schedule */}
          <div className="space-y-5">
            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Weekly Calendar</h2>
                <span className="text-xs text-muted-foreground">Plan ahead</span>
              </div>
              <div className="flex justify-center">
                <DateCalendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-xl border" />
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
              <p className="font-medium whitespace-pre-wrap">{detailsTarget?.notes || "No additional notes provided."}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAssignments;


