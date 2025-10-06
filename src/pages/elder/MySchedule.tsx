import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import nurseImg from "@/assets/volunteer-nurse.png";
import courierImg from "@/assets/volunteer-courier.jpg";
import { Calendar, MapPin, Clock, Phone, HeartHandshake, ShoppingBasket } from "lucide-react";

const ElderNavbar = () => {
  const user = getCurrentUser();
  return (
    <nav className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2" aria-label="ElderEase Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5" role="navigation" aria-label="Primary">
          <Link to="/elder" className="hover:opacity-80 transition-opacity">Home</Link>
          <Link to="/elder/schedule" className="hover:opacity-80 transition-opacity font-semibold">My Schedule</Link>
          <Link to="/elder/request-service" className="hover:opacity-80 transition-opacity">Request Service</Link>
          <Link to="/elder/notifications" className="hover:opacity-80 transition-opacity">Notifications</Link>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">Care Schedule</h1>
          <p className="text-muted-foreground">Here are your loved one's upcoming visits and helpful details, {firstName}.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Featured visit card (inspired by attached layout) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="grid sm:grid-cols-2 gap-0">
                <div className="p-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-2xl">Friendly Companionship</CardTitle>
                    <CardDescription>Relaxed conversation, a short walk, and light reading</CardDescription>
                  </CardHeader>
                  <ul className="text-sm space-y-2 text-muted-foreground mb-4">
                    <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> 50 minutes</li>
                    <li className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Today, 3:00 PM</li>
                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> At your home</li>
                  </ul>
                  <div className="flex gap-2">
                    <Button className="gap-2" aria-label="Call volunteer"><Phone className="h-4 w-4" /> Call</Button>
                    <Button variant="outline" className="gap-2" aria-label="Get directions"><MapPin className="h-4 w-4" /> Directions</Button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center bg-muted/40">
                  <img src={nurseImg} alt="Volunteer nurse" className="max-h-60 w-auto rounded-xl" />
                </div>
              </div>
            </Card>

            {/* Secondary assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingBasket className="h-5 w-5 text-primary" /> Grocery Errand</CardTitle>
                <CardDescription>Pick up essentials from the nearby market</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Tomorrow, 11:00 AM</p>
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Community Market • 1.2 mi</p>
                    <p className="flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Volunteer: Sam Rivera</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline">View List</Button>
                      <Button size="sm">Confirm</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <img src={courierImg} alt="Volunteer delivering groceries" className="rounded-xl max-h-40 w-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Day overview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Today</CardTitle>
                <CardDescription>Your day at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center"><HeartHandshake className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="font-medium">Companionship with Sam</p>
                    <p className="text-muted-foreground">3:00 PM • At home</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 grid place-items-center"><ShoppingBasket className="h-4 w-4 text-blue-600" /></div>
                  <div>
                    <p className="font-medium">Prepare grocery list</p>
                    <p className="text-muted-foreground">This evening • For tomorrow's errand</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 grid place-items-center"><Clock className="h-4 w-4 text-green-600" /></div>
                  <div>
                    <p className="font-medium">Short walk</p>
                    <p className="text-muted-foreground">After visit • 10 minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Helpful Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Keep medications and water nearby for your comfort during visits.</p>
                <p>• If you need to change timing, use the Request Service page anytime.</p>
                <p>• You can always reach us using the chat button at the bottom.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MySchedule;


