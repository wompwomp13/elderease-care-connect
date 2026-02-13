import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { IdDocumentView } from "@/components/IdDocumentView";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const [idDoc, setIdDoc] = useState<{ idFileUrl: string | null; idFileName?: string | null } | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth(setAuth);
    return () => unsub();
  }, []);

  useEffect(() => {
    const email = (auth?.email ?? "").trim().toLowerCase();
    if (!email || auth?.role !== "companion") {
      setIdDoc(null);
      return;
    }
    const q = query(collection(db, "pendingVolunteers"), where("email", "==", email));
    const unsub = onSnapshot(q, (snap) => {
      const doc = snap.docs[0];
      if (!doc) {
        setIdDoc(null);
        return;
      }
      const d = doc.data() as { idFileUrl?: string | null; idFileName?: string | null };
      setIdDoc({ idFileUrl: d.idFileUrl ?? null, idFileName: d.idFileName });
    });
    return () => unsub();
  }, [auth?.email, auth?.role]);

  const formatPH = (phone?: string | null): string => {
    if (!phone) return "—";
    const raw = phone.trim();
    if (raw.startsWith("+63")) return raw;
    const digits = raw.replace(/\D+/g, "");
    if (digits.startsWith("639") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
    return raw;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">My Profile</h1>
        <div className="grid gap-6 md:grid-cols-[1fr,auto]">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</span>
                  <span className="font-medium">{auth?.displayName || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</span>
                  <span className="font-medium break-all">{auth?.email || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</span>
                  <span className="font-medium">{formatPH(auth?.phone)}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</span>
                  <span className="font-medium capitalize">{auth?.role || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 py-2 border-b border-muted/50 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID</span>
                  <span className="font-mono text-xs font-medium truncate">{auth?.uid || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {auth?.role === "companion" && (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>ID Document</CardTitle>
                <p className="text-sm text-muted-foreground">Your submitted ID from your volunteer application</p>
              </CardHeader>
              <CardContent>
                <IdDocumentView
                  url={idDoc?.idFileUrl ?? null}
                  fileName={idDoc?.idFileName}
                  name={auth?.displayName || auth?.email || "Volunteer"}
                  className="w-full max-w-[240px]"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;


