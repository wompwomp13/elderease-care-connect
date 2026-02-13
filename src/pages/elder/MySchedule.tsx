import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.png";
import nurseImg from "@/assets/volunteer-nurse.png";
import courierImg from "@/assets/volunteer-courier.jpg";
import { Calendar, MapPin, Clock, Phone, HeartHandshake, ShoppingBasket, User } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star as StarIcon } from "lucide-react";
import ElderChatbot from "@/components/elder/ElderChatbot";
import { useToast } from "@/components/ui/use-toast";

const ElderNavbar = () => {
  const user = getCurrentUser();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2" aria-label="ElderEase Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5" role="navigation" aria-label="Primary">
          <Link to="/elder" className={`transition-opacity ${isActive("/elder") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Home</Link>
          <Link to="/elder/schedule" className={`transition-opacity ${isActive("/elder/schedule") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>My Schedule</Link>
          <Link to="/elder/request-service" className={`transition-opacity ${isActive("/elder/request-service") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Request Service</Link>
          <Link to="/elder/notifications" className={`transition-opacity ${isActive("/elder/notifications") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Notifications</Link>
          <button className="hover:opacity-80 transition-opacity">Profile</button>
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

const MySchedule = () => {
  const user = getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "Friend";
  const [uid, setUid] = useState<string | null>(user?.id ?? null);
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [rateTarget, setRateTarget] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>("");
  const { toast } = useToast();
  const [searchText, setSearchText] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => setUid(p?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) { setAssignments([]); return; }
    const q = query(collection(db, "assignments"), where("elderUserId", "==", uid), orderBy("serviceDateTS", "asc"));
    const unsub = onSnapshot(q, (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
    return () => unsub();
  }, [uid]);

  const toHours = (start24?: string | null, end24?: string | null): number => {
    if (!start24 || !end24) return 0;
    const [sh, sm] = start24.split(":").map((x: string) => parseInt(x, 10));
    const [eh, em] = end24.split(":").map((x: string) => parseInt(x, 10));
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const diff = endM - startM;
    return diff > 0 ? +(diff / 60).toFixed(2) : 0;
  };

  const upcoming = useMemo(() => (assignments || []).filter(a => a.status !== "completed"), [assignments]);
  const needsConfirm = useMemo(() => (assignments || []).filter(a => a.status === "completed" && !a.guardianConfirmed), [assignments]);
  const completed = useMemo(() => (assignments || []).filter(a => a.status === "completed" || a.guardianConfirmed), [assignments]);

  const toStartTimestamp = (a: any): number => {
    const day = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
    if (!day) return 0;
    const t = String(a.startTime24 || "");
    const [h, m] = t.split(":").map((x: string) => parseInt(x || "0", 10));
    const minutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    return day + minutes * 60 * 1000;
  };

  const upcomingSorted = useMemo(() => {
    const list = upcoming.slice();
    list.sort((a, b) => toStartTimestamp(a) - toStartTimestamp(b));
    return list;
  }, [upcoming]);

  const [completedSort, setCompletedSort] = useState<"desc" | "asc">("desc");

  const filteredCompleted = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase();
    let list = completed.slice();
    if (term) {
      list = list.filter((a) => {
        const services = Array.isArray(a.services) ? a.services.join(", ") : (a.services ?? "");
        const volunteer = a.volunteerName ?? "";
        const date = a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleDateString() : "";
        return [services, volunteer, date].some((v) => String(v).toLowerCase().includes(term));
      });
    }
    list.sort((a, b) => {
      const ta = toStartTimestamp(a);
      const tb = toStartTimestamp(b);
      return completedSort === "desc" ? tb - ta : ta - tb;
    });
    return list;
  }, [completed, appliedSearch, completedSort]);

  // Pagination for completed services
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filteredCompleted.length / pageSize));
  const pagedCompleted = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCompleted.slice(start, start + pageSize);
  }, [filteredCompleted, page]);
  useEffect(() => { setPage(1); }, [appliedSearch]); // reset page on new search

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">Care Schedule</h1>
          <p className="text-muted-foreground">Here are your loved one's upcoming visits and helpful details, {firstName}.</p>
        </div>

        {assignments === null ? (
          <div className="p-6 text-muted-foreground">Loading schedule…</div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-muted-foreground">No scheduled services yet.</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Needs confirmation */}
            {needsConfirm.length > 0 && (
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold mb-3">Needs Your Confirmation</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {needsConfirm.map((a) => (
                    <Card key={a.id} className="overflow-hidden hover:shadow-md transition-all border-amber-200">
                      <div className="p-5 flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-amber-100 grid place-items-center flex-shrink-0">
                          <User className="h-7 w-7 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold leading-tight truncate">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</h3>
                          <p className="text-sm text-muted-foreground truncate">{a.address || "At your home"}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {a.startTimeText} - {a.endTimeText}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleDateString() : "—"}</span>
                            {a.volunteerName && (
                              <span className="flex items-center gap-1"><User className="h-4 w-4" /> {a.volunteerName}</span>
                            )}
                          </div>
                          {a.notes && (
                            <p className="mt-3 text-sm">{a.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => setRateTarget(a)}>Confirm Completed</Button>
                          <Button size="sm" variant="outline" className="gap-2" aria-label="Call volunteer"><Phone className="h-4 w-4" /> Call</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {upcomingSorted.map((a) => (
              <Card key={a.id} className="overflow-hidden hover:shadow-md transition-all">
                <div className="p-5 flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold leading-tight truncate">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</h3>
                    <p className="text-sm text-muted-foreground truncate">{a.address || "At your home"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {a.startTimeText} - {a.endTimeText}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleDateString() : "—"}</span>
                      {a.volunteerName && (
                        <span className="flex items-center gap-1"><User className="h-4 w-4" /> {a.volunteerName}</span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="mt-3 text-sm">{a.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" className="gap-2" aria-label="Call volunteer"><Phone className="h-4 w-4" /> Call</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Completed Services - Tabular with search */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-3">Completed Services</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by service, volunteer, or date"
                className="max-w-sm"
              />
              <Button variant="outline" onClick={() => setAppliedSearch(searchText)}>Search</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <Select
                value={completedSort}
                onValueChange={(v: "desc" | "asc") => setCompletedSort(v)}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest first</SelectItem>
                  <SelectItem value="asc">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Volunteer</TableHead>
                    <TableHead className="text-right">Duration (hrs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompleted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No completed services found.</TableCell>
                    </TableRow>
                  ) : (
                    pagedCompleted.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{a.startTimeText} - {a.endTimeText}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</TableCell>
                        <TableCell>{a.volunteerName || "—"}</TableCell>
                        <TableCell className="text-right">{toHours(a.startTime24, a.endTime24)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {pageCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      {/* Rating Dialog */}
      <Dialog open={!!rateTarget} onOpenChange={(open) => { if (!open) setRateTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">How was your service with <span className="font-medium">{rateTarget?.volunteerName || 'your volunteer'}</span>?</p>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setRatingValue(n)} aria-label={`Rate ${n}`} className={`h-8 w-8 rounded-full grid place-items-center ${n <= ratingValue ? 'bg-amber-500 text-white' : 'bg-muted text-foreground'}`}>
                  <StarIcon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={3} placeholder="What did you like or what could be improved?" value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRateTarget(null)}>Cancel</Button>
              <Button onClick={async () => {
                if (!rateTarget) return;
                await updateDoc(doc(db, 'assignments', rateTarget.id), { guardianConfirmed: true, updatedAt: serverTimestamp() });
                await addDoc(collection(db, 'ratings'), {
                  assignmentId: rateTarget.id,
                  volunteerEmail: rateTarget.volunteerEmail || null,
                  volunteerName: rateTarget.volunteerName || null,
                  elderUserId: rateTarget.elderUserId || uid || null,
                  rating: ratingValue,
                  feedback: ratingFeedback || null,
                  createdAt: serverTimestamp(),
                });
                setRateTarget(null);
                setRatingValue(5);
                setRatingFeedback('');
                toast({ title: 'Thanks for your feedback!', description: 'Your confirmation and rating have been submitted.' });
              }}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ElderChatbot />
    </div>
  );
};

export default MySchedule;


