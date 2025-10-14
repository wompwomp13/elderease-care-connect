import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Calendar, MapPin, Clock, HeartHandshake, ShoppingBasket, Users, Filter } from "lucide-react";

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
          <Link to="/companion/requests" className={`transition-opacity ${isActive("/companion/requests") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Find Requests</Link>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0}>Activity Log</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0}>Profile</button>
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

const RequestCard = ({ title, tag, time, distance, desc, icon: Icon, emoji }: { title: string; tag: string; time: string; distance: string; desc: string; icon: any; emoji: string }) => (
  <div className="p-5 rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl" aria-hidden>{emoji}</span>
          <h3 className="font-semibold">{title}</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded-full">{tag}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{time} • {distance} away</p>
        <p className="text-sm">{desc}</p>
      </div>
      <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
    <div className="mt-3 flex gap-2">
      <Button size="sm">Accept</Button>
      <Button size="sm" variant="outline">Details</Button>
    </div>
  </div>
);

const RequestsBoard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Organic blobs */}
      <div className="pointer-events-none absolute -top-20 -left-16 h-64 w-64 rounded-[45%] bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-10 h-72 w-72 rounded-[40%] bg-amber-500/10 blur-3xl" />
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Find Requests</h1>
            <p className="text-muted-foreground">Browse open requests from guardians and choose where to help.</p>
          </div>
          <Button variant="outline" className="gap-2" aria-label="Filter requests"><Filter className="h-4 w-4" /> Filters</Button>
        </div>

        {/* Feature strip */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-3xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
            <p className="text-sm text-primary font-medium">Nearby</p>
            <p className="text-lg font-semibold">2 new requests within 2 miles</p>
          </div>
          <div className="rounded-3xl border bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-5">
            <p className="text-sm text-blue-600 font-medium">Today</p>
            <p className="text-lg font-semibold">1 request starts this afternoon</p>
          </div>
          <div className="rounded-3xl border bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-5">
            <p className="text-sm text-amber-600 font-medium">Flexible</p>
            <p className="text-lg font-semibold">Choose times that fit your schedule</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tall hero area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <RequestCard title="Friendly Companionship" tag="Companionship" time="Today • 4:30 PM" distance="2.3 mi" desc="Enjoy conversation and a gentle stroll together." icon={HeartHandshake} emoji="💬" />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <RequestCard title="Grocery Pick-up" tag="Errands" time="Tomorrow • 10:00 AM" distance="1.1 mi" desc="Collect groceries from the community market." icon={ShoppingBasket} emoji="🛒" />
              <RequestCard title="Social Activity" tag="Socialization" time="Saturday • 1:00 PM" distance="3.0 mi" desc="Join a small group card game at the center." icon={Users} emoji="🎲" />
            </div>
          </div>

          {/* Sidebar stacked cards */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <RequestCard title="Light Tidying" tag="Housekeeping" time="Sunday • 11:30 AM" distance="2.8 mi" desc="Help tidy the living room and kitchen area." icon={Calendar} emoji="🧹" />
            </div>
            <div className="p-6 rounded-3xl border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
              <p className="text-sm text-emerald-600 font-medium mb-1">Pro tip</p>
              <p className="text-sm text-muted-foreground">Set your availability so we can surface best-matching requests for you.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestsBoard;


