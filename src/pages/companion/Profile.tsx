import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

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
          <Link to="/companion/profile" className={`transition-opacity ${isActive("/companion/profile") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Profile</Link>
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

const Profile = () => {
  const [auth, setAuth] = useState<AuthProfile | null>(null);
  useEffect(() => {
    const unsub = subscribeToAuth(setAuth);
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">My Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{auth?.displayName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{auth?.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium">{auth?.role || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">UID</span><span className="font-medium">{auth?.uid || "—"}</span></div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;


