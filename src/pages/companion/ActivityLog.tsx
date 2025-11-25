import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Calendar, Clock, Star, User } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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
          <Link to="/companion/activity" className={`transition-opacity ${isActive("/companion/activity") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Activity Log</Link>
          <Link to="/companion/profile" className={`transition-opacity ${isActive("/companion/profile") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Profile</Link>
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

const ActivityLog = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const [email, setEmail] = useState<string | null>(user?.email ?? null);
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, any>>({});
  const [page, setPage] = useState<number>(1);
  const perPage = 5;

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => setEmail(p?.email?.toLowerCase() ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!email) { setAssignments([]); return; }
    const q = query(collection(db, "assignments"), where("volunteerEmail", "==", email), where("status", "==", "completed"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
    return () => unsub();
  }, [email]);

  useEffect(() => {
    if (!email) return;
    const q = query(collection(db, "ratings"), where("volunteerEmail", "==", email));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach((d) => { const r = d.data() as any; if (r.assignmentId) map[r.assignmentId] = r; });
      setRatings(map);
    });
    return () => unsub();
  }, [email]);

  const durationFromAssignment = (a: any) => {
    const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
    const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (!isFinite(mins) || mins <= 0) return "—";
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Activity Log</h1>

        {assignments === null ? (
          <div className="p-6 text-muted-foreground">Loading completed services…</div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-muted-foreground">No completed services yet.</div>
        ) : (
          (() => {
            const totalPages = Math.max(1, Math.ceil(assignments.length / perPage));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * perPage;
            const pageItems = assignments.slice(start, start + perPage);
            return (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {pageItems.map((a) => {
                    const r = ratings[a.id];
                    return (
                      <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleString() : "—"}</div>
                          <div className="text-sm text-muted-foreground"><Clock className="h-4 w-4 inline mr-1" /> {a.startTimeText} - {a.endTimeText}</div>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</h3>
                        <p className="text-sm text-muted-foreground mb-2">Guardian/Elder: {a.elderName || "—"}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Duration: <span className="font-medium">{durationFromAssignment(a)}</span></span>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Completed</span>
                        </div>
                        <div className="mt-3 p-3 rounded-xl bg-muted/40 border">
                          <p className="text-sm font-medium mb-1">Rating</p>
                          {r ? (
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1 mb-1">
                                {[1,2,3,4,5].map((n) => (
                                  <Star key={n} className={`h-4 w-4 ${n <= (r.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                                ))}
                              </div>
                              <p className="italic">{r.feedback || 'No comment provided.'}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not rated yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination className="mt-6">
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
          })()
        )}
      </main>
    </div>
  );
};

export default ActivityLog;


