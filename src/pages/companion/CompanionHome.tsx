import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout, getCurrentUser } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { useMemo } from "react";
import { Calendar, ClipboardList, Clock, UserCheck, CheckCircle2, Bell, MapPin, Phone } from "lucide-react";

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
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Dashboard" onClick={() => {}} onKeyDown={() => {}}>Dashboard</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="My Assignments" onClick={() => {}} onKeyDown={() => {}}>My Assignments</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Activity Log" onClick={() => {}} onKeyDown={() => {}}>Activity Log</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Profile" onClick={() => {}} onKeyDown={() => {}}>Profile</button>
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
  return (
    <div className="min-h-screen bg-background">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10">
        <div className="bg-card text-card-foreground rounded-xl p-6 border">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome, {displayName}!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for volunteering with ElderEase. Track your assignments, log your activity, and
            manage your profile—all in one place.
          </p>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Requests</p>
                <p className="text-2xl font-bold mt-1">3</p>
              </div>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Visits</p>
                <p className="text-2xl font-bold mt-1">2</p>
              </div>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hours This Week</p>
                <p className="text-2xl font-bold mt-1">4.5</p>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Main grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Next Visit</h2>
                  <span className="text-xs text-muted-foreground">Today, 3:00 PM</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Mary Thompson</p>
                    <p className="text-muted-foreground">Companionship • 1h • <span className="font-medium">2.1 mi</span></p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="bg-primary hover:bg-primary/90" aria-label="Open directions">
                    <MapPin className="h-4 w-4 mr-2" /> Directions
                  </Button>
                  <Button size="sm" variant="outline" aria-label="Call">
                    <Phone className="h-4 w-4 mr-2" /> Call
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-background">
                <h2 className="font-semibold mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" aria-label="Set availability"><Clock className="h-4 w-4 mr-2" /> Set Availability</Button>
                  <Button variant="outline" size="sm" aria-label="Review requests"><ClipboardList className="h-4 w-4 mr-2" /> Review Requests</Button>
                  <Button variant="outline" size="sm" aria-label="Log hours"><CheckCircle2 className="h-4 w-4 mr-2" /> Log Hours</Button>
                  <Button variant="outline" size="sm" aria-label="Notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-background">
                <h2 className="font-semibold mb-3">Recent Activity</h2>
                <ol className="relative border-l pl-4">
                  <li className="relative pl-2 pb-3">
                    <div className="absolute -left-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <p className="text-sm"><span className="font-medium">Completed visit</span> with Mary Thompson</p>
                    <p className="text-xs text-muted-foreground">Yesterday • 1h companionship</p>
                  </li>
                  <li className="relative pl-2 pb-3">
                    <div className="absolute -left-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <p className="text-sm"><span className="font-medium">Accepted request</span> for grocery run</p>
                    <p className="text-xs text-muted-foreground">2 days ago • 45m errands</p>
                  </li>
                  <li className="relative pl-2">
                    <div className="absolute -left-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <p className="text-sm"><span className="font-medium">Updated availability</span> for this week</p>
                    <p className="text-xs text-muted-foreground">3 days ago • M, W, F mornings</p>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompanionHome;


