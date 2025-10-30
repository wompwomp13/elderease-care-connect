import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout, getCurrentUser, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import volunteerHero from "@/assets/volunteer-hero.jpg";
import { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardList, Clock, UserCheck, CheckCircle2, Bell, MapPin, Phone, Award, Heart, TrendingUp, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

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

const CompanionHome = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const displayName = user?.name ?? "Companion";
  const [email, setEmail] = useState<string | null>(user?.email ?? null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => setEmail(p?.email?.toLowerCase() ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!email) { setAssignments([]); return; }
    const qA = query(collection(db, "assignments"), where("volunteerEmail", "==", email));
    const unsubA = onSnapshot(qA, (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
    const qR = query(collection(db, "ratings"), where("volunteerEmail", "==", email));
    const unsubR = onSnapshot(qR, (snap) => {
      let sum = 0, count = 0;
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const v = Number(r.rating) || 0;
        if (v > 0) { sum += v; count += 1; }
      });
      setRatingAvg(count ? sum / count : null);
      setRatingCount(count);
    });
    return () => { unsubA(); unsubR(); };
  }, [email]);

  const todayStartMs = new Date().setHours(0,0,0,0);
  const weekEndMs = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).setHours(23,59,59,999);
  const weekAssignments = assignments.filter((a) => typeof a.serviceDateTS === "number" && a.serviceDateTS >= todayStartMs && a.serviceDateTS <= weekEndMs);

  const isCompletedConfirmed = (a: any) => a.status === "completed" && a.guardianConfirmed === true;
  const durationMinutes = (a: any) => {
    const s = String(a.startTime24 || "");
    const e = String(a.endTime24 || "");
    if (!s.includes(":") || !e.includes(":")) return 0;
    const [sh, sm] = s.split(":").map((t: string) => parseInt(t, 10));
    const [eh, em] = e.split(":").map((t: string) => parseInt(t, 10));
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const diff = end - start;
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  };

  const hoursThisWeek = weekAssignments.reduce((acc, a) => acc + durationMinutes(a), 0) / 60;
  const totalCompletedServices = assignments.filter(isCompletedConfirmed).length;
  const totalCompletedHours = assignments.filter(isCompletedConfirmed).reduce((acc, a) => acc + durationMinutes(a), 0) / 60;
  const peopleHelped = Array.from(new Set(assignments.filter(isCompletedConfirmed).map((a) => a.elderName).filter(Boolean))).length;

  const getLevel = (hours: number, services: number) => {
    if (hours >= 100 || services >= 50) return { label: "Community Hero", next: "Keep inspiring!" };
    if (hours >= 40 || services >= 20) return { label: "Impact Maker", next: "Next: 100 hours or 50 services" };
    if (hours >= 10 || services >= 5) return { label: "Rising Helper", next: "Next: 40 hours or 20 services" };
    return { label: "Starter", next: "Next: 10 hours or 5 services" };
  };
  const level = getLevel(totalCompletedHours, totalCompletedServices);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Making a Difference</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Welcome back, <span className="text-primary">{displayName}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Thank you for being a valued volunteer. Your compassion and dedication bring joy and support to our community members.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/companion/assignments">
                  <Button size="lg" className="gap-2">
                    <ClipboardList className="h-5 w-5" />
                    View Assignments
                  </Button>
                </Link>
                <Link to="/companion/requests">
                  <Button size="lg" variant="outline" className="gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Find Requests
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
              <img src={volunteerHero} alt="Volunteers" className="relative rounded-3xl shadow-2xl w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-primary rounded-full">3</span>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Open Requests</h3>
            <p className="text-2xl font-bold">Available</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-500/10 px-2 py-1 rounded-full">This Week</span>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Upcoming Visits</h3>
            <p className="text-2xl font-bold">{weekAssignments.length}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-2xl border border-green-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Hours This Week</h3>
            <p className="text-2xl font-bold">{hoursThisWeek.toFixed(1)}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 rounded-2xl border border-amber-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Total Impact</h3>
            <p className="text-2xl font-bold">{totalCompletedServices} Visits</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* This Week Overview (from assignments) */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">This Week Overview</h2>
              <div className="space-y-3">
                {weekAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments this week.</p>
                ) : weekAssignments
                    .sort((a, b) => (a.serviceDateTS ?? 0) - (b.serviceDateTS ?? 0))
                    .map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-background border">
                    <div className="text-sm">
                      <p className="font-medium">{Array.isArray(a.services) ? a.services.join(", ") : a.services}</p>
                      <p className="text-muted-foreground">{new Date(a.serviceDateTS).toLocaleDateString()} • {a.startTimeText} - {a.endTimeText}</p>
                    </div>
                    {a.status === "completed" ? (
                      a.guardianConfirmed ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Completed</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Awaiting confirm</span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Assigned</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Impact Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Your Impact</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="text-lg font-bold">{totalCompletedHours.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">People Helped</span>
                  <span className="text-lg font-bold">{peopleHelped}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="text-lg font-bold">{ratingAvg ? ratingAvg.toFixed(1) : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recognition */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 rounded-2xl border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold">Keep Going!</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You're making a real difference. Based on your impact so far, you're at the <span className="font-medium text-amber-700">{level.label}</span> level.
              </p>
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <Award className="h-8 w-8 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Next milestone</p>
                  <p className="text-xs text-muted-foreground">{level.next}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Services: {totalCompletedServices}</p>
                  <p className="text-xs text-muted-foreground">Hours: {totalCompletedHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompanionHome;
