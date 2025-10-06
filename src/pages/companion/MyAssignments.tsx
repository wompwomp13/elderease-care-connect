import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Calendar, MapPin, Phone, User, Clock, HeartHandshake, ShoppingBasket, CheckCircle2 } from "lucide-react";

const CompanionNavbar = () => {
  const user = getCurrentUser();
  return (
    <nav className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/companion" className="flex items-center gap-2" aria-label="ElderEase Companion Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase Companion</span>
        </Link>
        <div className="hidden md:flex items-center gap-5" role="navigation" aria-label="Primary">
          <Link to="/companion" className="hover:opacity-80 transition-opacity">Dashboard</Link>
          <Link to="/companion/assignments" className="hover:opacity-80 transition-opacity font-semibold">My Assignments</Link>
          <Link to="/companion/requests" className="hover:opacity-80 transition-opacity">Find Requests</Link>
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

const MyAssignments = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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
          {/* Left: assignments cards */}
          <div className="lg:col-span-2 space-y-5">
            {/* Assignment type 1 */}
            <div className="rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
                    <HeartHandshake className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Companionship — Mary Thompson</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Today • 3:00 PM</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> 2.1 mi away</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-2"><Phone className="h-4 w-4" /> Call</Button>
                  <Button size="sm" variant="outline" className="gap-2"><MapPin className="h-4 w-4" /> Directions</Button>
                </div>
              </div>
            </div>

            {/* Assignment type 2 */}
            <div className="rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 grid place-items-center">
                    <ShoppingBasket className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Grocery Errand — Smith Family</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Tomorrow • 11:00 AM</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Community Market • 1.2 mi</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View List</Button>
                  <Button size="sm" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Confirm</Button>
                </div>
              </div>
            </div>

            {/* Assignment type 3 */}
            <div className="rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 grid place-items-center">
                    <User className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Home Visit — James Lee</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Saturday • 10:30 AM</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> 60 minutes</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Details</Button>
                  <Button size="sm" variant="outline">Reschedule</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: schedule and overview */}
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

            <div className="rounded-3xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">This Week Overview</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
                  <span className="font-medium">Today</span>
                  <span className="text-muted-foreground">Companionship • 3:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
                  <span className="font-medium">Tomorrow</span>
                  <span className="text-muted-foreground">Grocery Errand • 11:00 AM</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
                  <span className="font-medium">Saturday</span>
                  <span className="text-muted-foreground">Home Visit • 10:30 AM</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start gap-2"><Clock className="h-4 w-4" /> Set Availability</Button>
                <Link to="/companion/requests" className="contents">
                  <Button variant="outline" className="justify-start gap-2"><Calendar className="h-4 w-4" /> Find Requests</Button>
                </Link>
                <Button variant="outline" className="justify-start gap-2"><CheckCircle2 className="h-4 w-4" /> Log Hours</Button>
                <Button variant="outline" className="justify-start gap-2"><MapPin className="h-4 w-4" /> Directions</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyAssignments;


