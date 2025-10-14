import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { Bell, Calendar, HeartHandshake, ShoppingBasket, Home, Users, MessageSquare } from "lucide-react";

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

const items = [
  {
    id: "n1",
    icon: Calendar,
    title: "Upcoming visit today at 3:00 PM",
    text: "Sam will arrive for companionship. Please have your preferred activities ready.",
    badge: "Today",
    tone: "info",
  },
  {
    id: "n2",
    icon: ShoppingBasket,
    title: "Grocery assistance available tomorrow",
    text: "Would you like help picking up milk, bread, or medications?",
    badge: "Suggestion",
    tone: "suggest",
  },
  {
    id: "n3",
    icon: HeartHandshake,
    title: "New friendly group walk this Saturday",
    text: "Join a gentle 20-minute walk at the community park. Wheelchair friendly.",
    badge: "Community",
    tone: "highlight",
  },
  {
    id: "n4",
    icon: Home,
    title: "Light housekeeping recommended",
    text: "We can help tidy up living spaces and kitchen. Tap to request a visit.",
    badge: "Tip",
    tone: "suggest",
  },
  {
    id: "n5",
    icon: MessageSquare,
    title: "New message from ElderEase Assistant",
    text: "Hello! Remember you can ask for help anytime using the chat button.",
    badge: "New",
    tone: "info",
  },
];

const toneClasses: Record<string, string> = {
  info: "border-blue-500/20 bg-blue-500/5",
  suggest: "border-amber-500/20 bg-amber-500/5",
  highlight: "border-green-500/20 bg-green-500/5",
};

const Notifications = () => {
  const user = getCurrentUser();
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
          {items.map((n) => {
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
                </div>
                <button className="text-xs text-primary hover:underline" aria-label="Mark as read">Mark as read</button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Notifications;


