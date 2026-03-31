import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ElderNavbar } from "@/components/elder/ElderNavbar";
import { subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

const ElderProfile = () => {
  const [auth, setAuth] = useState<AuthProfile | null>(null);

  useEffect(() => subscribeToAuth(setAuth), []);

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <ElderNavbar />
        <div className="container mx-auto px-4 py-6 max-w-4xl text-muted-foreground">Loading profile…</div>
      </div>
    );
  }
  if (auth.role !== "elderly") {
    return <Navigate to="/elder" replace />;
  }

  const displayName = (auth.displayName ?? "").trim() || "—";
  const phoneDisplay = auth.phone?.trim() ? formatPH(auth.phone) : "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      <main className="container mx-auto px-4 py-6 md:py-7 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
        <CardDescription className="mt-1.5 mb-4 text-sm leading-snug">
          Your guardian account details. For name or phone changes, contact support. Email is used to sign in and cannot be changed here.
        </CardDescription>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 p-4 space-y-0.5">
            <CardTitle className="text-base font-semibold leading-tight">Account details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border text-sm">
              <div className="flex flex-col gap-0.5 px-4 py-3">
                <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Name</dt>
                <dd className="font-medium text-foreground leading-snug">{displayName}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-4 py-3">
                <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Email</dt>
                <dd className="font-medium break-all leading-snug">{auth.email || "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-4 py-3 sm:border-t">
                <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Phone</dt>
                <dd className="font-medium leading-snug">{phoneDisplay}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-4 py-3 sm:border-t">
                <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Role</dt>
                <dd className="font-medium capitalize leading-snug">{auth.role || "—"}</dd>
              </div>
            </dl>
            <div className="border-t border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">User ID</p>
              <p className="mt-0.5 font-mono text-xs text-foreground break-all leading-snug">{auth.uid || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ElderProfile;
