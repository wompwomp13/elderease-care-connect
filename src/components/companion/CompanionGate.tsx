import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const CompanionGate = () => {
  const [user, setUser] = useState(() => getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => {
      if (!p) {
        setUser(null);
        return;
      }
      setUser({
        id: p.uid,
        name: p.displayName ?? p.email ?? "User",
        role: p.role,
        terminated: p.terminated,
        terminationReason: p.terminationReason,
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  if (user.terminated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <header className="bg-primary text-primary-foreground py-4 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
              <span className="text-lg font-bold">ElderEase Companion</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/60 bg-white/15 text-white hover:bg-white/25 hover:text-white hover:border-white/80"
              onClick={() => { logout(); window.location.href = "/"; }}
            >
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border bg-card p-8 shadow-lg text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="text-rose-600 text-2xl">!</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Your account has been terminated</h1>
              <p className="mt-3 text-muted-foreground">
                {user.terminationReason || "No reason was provided."}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              If you believe this was a mistake or would like to appeal, please contact support.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { logout(); window.location.href = "/"; }}
            >
              Logout
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
};

export default CompanionGate;
