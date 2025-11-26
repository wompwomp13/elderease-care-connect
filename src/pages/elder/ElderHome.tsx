import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import companionshipImage from "@/assets/elder-companionship.jpg";
import { useMemo, useRef, useState, useEffect } from "react";
import { HeartHandshake, ShoppingBasket, Home, Users, Calendar, Bell, MessageSquare, Sparkles } from "lucide-react";
import ElderChatbot from "@/components/elder/ElderChatbot";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
            <Button
              variant="nav"
              size="sm"
              onClick={() => { logout(); window.location.href = "/"; }}
              aria-label="Log out"
            >
              Logout
            </Button>
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

type ChatMessage = { id: string; sender: "bot" | "user"; text: string; time: string };

const ChatPanel = ({ isOpen, handleClose }: { isOpen: boolean; handleClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", sender: "bot", text: "Hello! I'm your ElderEase assistant.", time: "now" },
    { id: "m2", sender: "bot", text: "How can I help you today?", time: "now" },
  ]);
  const [pendingText, setPendingText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSendMessage = () => {
    if (!pendingText.trim()) return;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: pendingText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setPendingText("");
    const botReply: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "bot",
      text: "Thanks for your message! A companion can help with companionship, errands, and more.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTimeout(() => setMessages((prev) => [...prev, botReply]), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  if (!isOpen) return null;

  return (
    <section
      className="fixed bottom-24 right-6 w-80 sm:w-96 bg-card text-card-foreground rounded-xl shadow-2xl border flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Messenger chat window"
      tabIndex={0}
    >
      <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M2 12.5C2 7.81 6.03 4 11 4s9 3.81 9 8.5S15.97 21 11 21c-1.01 0-1.98-.14-2.88-.41-.2-.06-.42-.04-.6.05L4.1 21.78c-.7.35-1.48-.33-1.22-1.06l1.1-3.02c.07-.2.06-.43-.03-.62C2.56 15.69 2 14.15 2 12.5Z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">ElderEase Assistant</p>
            <p className="text-xs opacity-90">Online • Helpful & friendly</p>
          </div>
        </div>
        <button
          className="p-1 rounded hover:bg-white/10"
          aria-label="Close chat"
          tabIndex={0}
          onClick={handleClose}
          onKeyDown={(e) => { if (e.key === "Enter") handleClose(); }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3z"/>
          </svg>
        </button>
      </header>

      <div ref={scrollRef} className="px-3 py-3 space-y-2 max-h-80 overflow-y-auto bg-background">
        {messages.map((m) => (
          <div key={m.id} className={m.sender === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.sender === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 shadow"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 shadow"
              }
            >
              <p className="text-sm leading-relaxed">{m.text}</p>
              <p className="text-[10px] opacity-70 mt-1 text-right">{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-card border-t">
        <div className="flex items-center gap-2">
          <Input
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            aria-label="Type your message"
          />
          <Button
            aria-label="Send message"
            className="px-3"
            onClick={handleSendMessage}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
};

const ChatWidget = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => {
  return (
    <button
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      aria-label={isOpen ? "Close chat" : "Open chat with support bot"}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter") onToggle(); }}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <path fill="currentColor" d="M2 12.5C2 7.81 6.03 4 11 4s9 3.81 9 8.5S15.97 21 11 21c-1.01 0-1.98-.14-2.88-.41-.2-.06-.42-.04-.6.05L4.1 21.78c-.7.35-1.48-.33-1.22-1.06l1.1-3.02c.07-.2.06-.43-.03-.62C2.56 15.69 2 14.15 2 12.5Z"/>
        <circle cx="8.5" cy="12.5" r="1.25" fill="#fff"/>
        <circle cx="11" cy="12.5" r="1.25" fill="#fff"/>
        <circle cx="13.5" cy="12.5" r="1.25" fill="#fff"/>
      </svg>
    </button>
  );
};

const ElderHome = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const greetingName = user?.name ?? "there";
  const [pendingRequests, setPendingRequests] = useState<any[] | null>(null);
  const [upcoming, setUpcoming] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [upcomingVolunteer, setUpcomingVolunteer] = useState<any | null>(null);

  // Cancel request dialog state
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("schedule_change");
  const [cancelOther, setCancelOther] = useState<string>("");

  const toMinutes = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = String(t).split(":").map((x: string) => parseInt(x || "0", 10));
    if (!isFinite(h)) return null;
    return h * 60 + (m || 0);
  };

  useEffect(() => {
    const uid = user?.id;
    if (!uid) { setPendingRequests([]); return; }
    const q = query(collection(db, "serviceRequests"), where("userId", "==", uid), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setPendingRequests(rows);
    });
    return () => unsub();
  }, [user?.id]);

  // Next Support Visit - listen to upcoming assignments for this elder
  useEffect(() => {
    const uid = user?.id;
    if (!uid) { setUpcoming(null); return; }
    const q = query(collection(db, "assignments"), where("elderUserId", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const nowMs = Date.now();
      let best: any | null = null;
      snap.docs.forEach((d) => {
        const a = { id: d.id, ...(d.data() as any) };
        if (a.status === "cancelled") return;
        const dayMs = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
        const mins = toMinutes(a.startTime24);
        if (dayMs && mins != null) {
          const startTs = dayMs + mins * 60 * 1000;
          if (startTs >= nowMs) {
            if (!best) best = a;
            else {
              const bestStart = (typeof best.serviceDateTS === "number" ? best.serviceDateTS : (best.serviceDateTS?.toMillis?.() ?? 0)) + (toMinutes(best.startTime24) || 0) * 60 * 1000;
              if (startTs < bestStart) best = a;
            }
          }
        }
      });
      setUpcoming(best);
    });
    return () => unsub();
  }, [user?.id]);

  // Keep volunteer info in sync (reflect admin edits)
  useEffect(() => {
    if (!upcoming) { setUpcomingVolunteer(null); return; }
    const email = (upcoming.volunteerEmail || "").toLowerCase();
    const uid = upcoming.volunteerUid || null;
    const unsubs: Array<() => void> = [];
    // Prefer direct users/{uid}
    if (uid) {
      const uref = doc(db, "users", uid);
      const unsub = onSnapshot(uref, (snap) => {
        if (snap.exists()) {
          setUpcomingVolunteer({ source: "usersDoc", ...snap.data() });
        }
      });
      unsubs.push(unsub);
    }
    // Also listen by email in users (in case no uid on assignment)
    if (email) {
      const uq = query(collection(db, "users"), where("email", "==", email));
      const unsubU = onSnapshot(uq, (snap) => {
        if (!snap.empty) {
          setUpcomingVolunteer({ source: "usersQuery", ...snap.docs[0].data() });
        }
      });
      unsubs.push(unsubU);
      // And pendingVolunteers for completeness
      const pvq = query(collection(db, "pendingVolunteers"), where("email", "==", email));
      const unsubPV = onSnapshot(pvq, (snap) => {
        if (!snap.empty) {
          setUpcomingVolunteer((prev: any) => prev || { source: "pendingVolunteers", ...snap.docs[0].data() });
        }
      });
      unsubs.push(unsubPV);
    }
    return () => { unsubs.forEach((u) => u()); };
  }, [upcoming]);

  const confirmCancelRequest = async () => {
    if (!cancelTarget?.id) return;
    try {
      await updateDoc(doc(db, "serviceRequests", cancelTarget.id), {
        status: "cancelled",
        cancelledBy: user?.id || null,
        cancelReasonCode: cancelReason,
        cancelReasonText: cancelOther?.trim() ? cancelOther.trim() : null,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCancelTarget(null);
      setCancelOther("");
      setCancelReason("schedule_change");
    } catch {
      // noop
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
               <span className="text-sm font-medium text-primary">Welcome Back, Guardian</span>
              </div>
               <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                 Hello, <span className="text-primary">{greetingName}</span>
               </h1>
               <p className="text-lg text-muted-foreground">
                 You’re managing care for your loved one. Schedule visits, request services, and keep track of updates in one place.
               </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2">
                  <Calendar className="h-5 w-5" />
                  View Schedule
                </Button>
                <Link to="/elder/request-service">
                  <Button size="lg" variant="outline" className="gap-2">
                    <HeartHandshake className="h-5 w-5" />
                    Request Service
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
              <img
                src="/guardian-hero.jpg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = companionshipImage; }}
                alt="Companionship"
                className="relative rounded-3xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        {/* Next Support Visit - live data */}
        <div className="bg-card p-6 rounded-2xl border shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Next Support Visit</h2>
            {upcoming ? (
              <span className="text-sm font-medium text-primary">
                {new Date(typeof upcoming.serviceDateTS === "number" ? upcoming.serviceDateTS : (upcoming.serviceDateTS?.toMillis?.() ?? 0))
                  .toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No upcoming visit</span>
            )}
          </div>
          {upcoming ? (
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
              <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                <HeartHandshake className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{Array.isArray(upcoming.services) ? upcoming.services.join(", ") : (upcoming.services || "Service")}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {(upcomingVolunteer?.displayName || upcomingVolunteer?.fullName || upcoming.volunteerName || "Volunteer")}
                  {upcoming.volunteerEmail ? ` (${upcoming.volunteerEmail})` : (upcomingVolunteer?.email ? ` (${upcomingVolunteer.email})` : "")}
                  {" • "}{upcoming.startTimeText} - {upcoming.endTimeText} • {upcoming.address || "—"}
                </p>
                <div className="flex gap-3">
                  <Button size="sm" className="gap-2" onClick={() => setShowDetails(true)}>
                    <Calendar className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">When you have an assigned visit, it will appear here.</div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Requests */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Pending Requests</h2>
                <span className="text-xs text-muted-foreground">Awaiting assignment</span>
              </div>
              {pendingRequests === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{Array.isArray(req.services) ? req.services.join(", ") : req.services}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.serviceDateDisplay} • {req.startTimeText} - {req.endTimeText}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                        <Button size="sm" variant="outline" onClick={() => { setCancelTarget(req); setCancelReason("schedule_change"); setCancelOther(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
                 <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link to="/elder/request-service" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Request a service">
                    <HeartHandshake className="h-5 w-5 text-primary" />
                   <span>Request a Service</span>
                  </Button>
                </Link>
                <Link to="/elder/schedule" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="View schedule">
                    <Calendar className="h-5 w-5 text-blue-600" />
                     <span>View Schedule</span>
                  </Button>
                </Link>
                <Link to="/elder/notifications" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Check notifications">
                    <Bell className="h-5 w-5 text-green-600" />
                     <span>Notifications</span>
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Message companion">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                   <span>Message Volunteer</span>
                </Button>
              </div>
            </div>

            {/* Services - compact card on right side */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
               <h2 className="text-xl font-bold mb-4">Services for your loved one</h2>
              <div className="grid gap-3">
                <div className="group p-3 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <ShoppingBasket className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">Running Errands</h3>
                      <p className="text-xs text-muted-foreground">Help with shopping and deliveries</p>
                    </div>
                  </div>
                </div>

                <div className="group p-3 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                      <Home className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">Light Housekeeping</h3>
                      <p className="text-xs text-muted-foreground">Keep your space tidy and comfortable</p>
                    </div>
                  </div>
                </div>

                <div className="group p-3 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                      <HeartHandshake className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">Home Visits</h3>
                      <p className="text-xs text-muted-foreground">Regular check-ins and support</p>
                    </div>
                  </div>
                </div>

                <div className="group p-3 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">Companionship</h3>
                      <p className="text-xs text-muted-foreground">Friendly support and conversation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Helpful Tips */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                 <h2 className="text-lg font-bold">Helpful Tips for Guardians</h2>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                   <span>Prepare a short list of tasks your loved one needs help with</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                   <span>Keep their shopping list handy and up to date</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Use the chat button anytime you have questions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <ElderChatbot />

      {/* Visit Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
          </DialogHeader>
          {upcoming && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Volunteer</span>
                <span className="font-medium">
                  {upcomingVolunteer?.displayName || upcomingVolunteer?.fullName || upcoming.volunteerName || "—"}
                  {upcoming.volunteerEmail ? ` (${upcoming.volunteerEmail})` : (upcomingVolunteer?.email ? ` (${upcomingVolunteer.email})` : "")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Services</span>
                <span className="font-medium">{Array.isArray(upcoming.services) ? upcoming.services.join(", ") : (upcoming.services || "—")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">
                  {new Date(typeof upcoming.serviceDateTS === "number" ? upcoming.serviceDateTS : (upcoming.serviceDateTS?.toMillis?.() ?? 0)).toLocaleDateString()} • {upcoming.startTimeText} - {upcoming.endTimeText}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right">{upcoming.address || "—"}</span>
              </div>
              {upcoming.notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{upcoming.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Request Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel request?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">You can tell us why (optional) to help us improve.</p>
            <div className="space-y-2">
              <Label className="text-xs">Reason</Label>
              <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schedule_change" id="r1" />
                  <Label htmlFor="r1">Schedule changed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="price_high" id="r2" />
                  <Label htmlFor="r2">Price is too high</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="preferred_unavailable" id="r3" />
                  <Label htmlFor="r3">Preferred volunteer unavailable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entered_wrong_info" id="r4" />
                  <Label htmlFor="r4">Entered wrong information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="r5" />
                  <Label htmlFor="r5">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cancelOther" className="text-xs">Comment (optional)</Label>
              <Textarea id="cancelOther" placeholder="Tell us a bit more (optional)" value={cancelOther} onChange={(e) => setCancelOther(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Back</Button>
              <Button variant="destructive" onClick={confirmCancelRequest}>Confirm Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElderHome;


