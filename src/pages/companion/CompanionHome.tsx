import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout, getCurrentUser } from "@/lib/auth";
import logo from "@/assets/logo.png";
import volunteerHero from "@/assets/volunteer-hero.jpg";
import { useMemo } from "react";
import { Calendar, ClipboardList, Clock, UserCheck, CheckCircle2, Bell, MapPin, Phone, Award, Heart, TrendingUp, Star } from "lucide-react";

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
          <Link to="/companion/assignments" className="hover:opacity-80 transition-opacity">My Assignments</Link>
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

const CompanionHome = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const displayName = user?.name ?? "Companion";
  
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
            <p className="text-2xl font-bold">2</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-2xl border border-green-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Hours This Week</h3>
            <p className="text-2xl font-bold">4.5</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 rounded-2xl border border-amber-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Total Impact</h3>
            <p className="text-2xl font-bold">45 Visits</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Visit */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Next Visit</h2>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Clock className="h-4 w-4" />
                  <span>Today, 3:00 PM</span>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <UserCheck className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Mary Thompson</h3>
                  <p className="text-sm text-muted-foreground mb-3">Companionship • 1 hour • 2.1 miles away</p>
                  <div className="flex gap-3">
                    <Button size="sm" className="gap-2">
                      <MapPin className="h-4 w-4" />
                      Directions
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Phone className="h-4 w-4" />
                      Call
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Requests */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Available Requests</h2>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-500/5 to-transparent hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Grocery Shopping</h3>
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">Errands</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Tomorrow • 10:00 AM • 1.5 mi away</p>
                      <p className="text-sm">Help with weekly grocery shopping at local market</p>
                    </div>
                    <Button size="sm" variant="outline">Accept</Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-gradient-to-r from-green-500/5 to-transparent hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Afternoon Chat</h3>
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">Companionship</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Friday • 2:00 PM • 3.2 mi away</p>
                      <p className="text-sm">Looking for friendly conversation and company</p>
                    </div>
                    <Button size="sm" variant="outline">Accept</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="relative border-l-2 border-primary/20 pl-6 space-y-6">
                <div className="relative">
                  <div className="absolute -left-8 top-1 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                  <div className="space-y-1">
                    <p className="font-medium">Completed visit with Mary Thompson</p>
                    <p className="text-sm text-muted-foreground">Yesterday • 1h companionship</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-8 top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-background" />
                  <div className="space-y-1">
                    <p className="font-medium">Accepted grocery assistance request</p>
                    <p className="text-sm text-muted-foreground">2 days ago • 45m errands</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-8 top-1 h-4 w-4 rounded-full bg-muted border-4 border-background" />
                  <div className="space-y-1">
                    <p className="font-medium">Updated availability schedule</p>
                    <p className="text-sm text-muted-foreground">3 days ago • M, W, F mornings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Set Availability</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <span>Review Requests</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Log Hours</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3">
                  <Bell className="h-5 w-5 text-purple-600" />
                  <span>Notifications</span>
                </Button>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Your Impact</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="text-lg font-bold">87.5h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">People Helped</span>
                  <span className="text-lg font-bold">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="text-lg font-bold">4.9</span>
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
                You're making a real difference in people's lives. Thank you for your dedication!
              </p>
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <Award className="h-8 w-8 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Super Volunteer</p>
                  <p className="text-xs text-muted-foreground">50+ hours milestone</p>
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
