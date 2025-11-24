import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { Bell, Calendar, HeartHandshake, ShoppingBasket, Home, Users, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ElderChatbot from "@/components/elder/ElderChatbot";

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

type NotificationItem = { id: string; icon: any; title: string; text: string; badge: string; tone: string; receipt?: any };

const toneClasses: Record<string, string> = {
  info: "border-blue-500/20 bg-blue-500/5",
  suggest: "border-amber-500/20 bg-amber-500/5",
  highlight: "border-green-500/20 bg-green-500/5",
};

const Notifications = () => {
  const user = getCurrentUser();
  const [uid, setUid] = useState<string | null>(user?.id ?? null);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const formatPHP = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(value);

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => setUid(p?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) { setItems([]); return; }
    const q = query(collection(db, "assignments"), where("elderUserId", "==", uid), where("status", "==", "assigned"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: NotificationItem[] = snap.docs.map((d) => {
        const a = d.data() as any;
        return {
          id: d.id,
          icon: HeartHandshake,
          title: `Service confirmed: ${Array.isArray(a.services) ? a.services.join(", ") : a.services}`,
          text: `${a.startTimeText} - ${a.endTimeText} on ${a.serviceDateTS ? new Date(a.serviceDateTS).toLocaleDateString() : ""}`,
          badge: "Confirmed",
          tone: "info",
          receipt: a.receipt || null,
        };
      });
      setItems(arr);
    });
    return () => unsub();
  }, [uid]);
  const name = user?.name?.split(" ")[0] ?? "there";
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
         <p className="text-muted-foreground mb-6">Hi {name}, here are gentle reminders and helpful suggestions for your loved one's care.</p>

        <div className="space-y-3">
          {items === null ? (
            <div className="p-6 text-muted-foreground">Loading notifications…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-muted-foreground">No new notifications.</div>
          ) : items.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className={`rounded-xl border p-4 flex items-start gap-3 ${toneClasses[n.tone]}`}>
                <div className="p-2 rounded-lg bg-white/50">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{n.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{n.badge}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.text}</p>
                  {n.receipt && (
                    <div className="mt-3">
                      <button className="text-xs text-primary hover:underline" onClick={() => toggleExpand(n.id)}>
                        {expanded[n.id] ? "Hide Receipt" : "View Receipt"}
                      </button>
                      {expanded[n.id] && (
                        <div className="mt-3 rounded-lg border bg-background">
                          <div className="p-3 border-b">
                            <p className="text-xs text-muted-foreground">Confirmation Number</p>
                            <p className="font-medium">{n.receipt.confirmationNumber || `#SR-${n.id.slice(0, 8).toUpperCase()}`}</p>
                          </div>
                          <div className="p-3 space-y-3 text-sm">
                            <p className="font-medium">Receipt</p>
                            {Array.isArray(n.receipt.lineItems) && n.receipt.lineItems.length > 0 ? (
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Service</TableHead>
                                      <TableHead>Rate/hr</TableHead>
                                      <TableHead>Hours</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {n.receipt.lineItems.map((li: any) => (
                                      <TableRow key={li.name}>
                                        <TableCell>{li.name}</TableCell>
                                        <TableCell>{formatPHP(li.adjustedRate ?? li.baseRate)}</TableCell>
                                        <TableCell>{(li.hours ?? 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{formatPHP(li.amount ?? 0)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">No line items.</div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-medium">{formatPHP(n.receipt.subtotal ?? 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commission (5%)</span>
                              <span className="font-medium">{formatPHP(n.receipt.commission ?? 0)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-base">
                              <span className="font-semibold">Total Amount</span>
                              <span className="font-bold text-primary">{formatPHP(n.receipt.total ?? 0)}</span>
                            </div>
                            {n.receipt.volunteerTier && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Tier: {n.receipt.volunteerTier} • Adjustment: {Math.round((n.receipt.rateAdjustment ?? 0) * 100)}%
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button className="text-xs text-primary hover:underline" aria-label="Mark as read">Mark as read</button>
              </div>
            );
          })}
        </div>
      </main>
      <ElderChatbot />
    </div>
  );
};

export default Notifications;


