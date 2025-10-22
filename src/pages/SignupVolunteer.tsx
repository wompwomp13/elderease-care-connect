import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-background.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { signUpWithEmail, requireRoleRedirectPath } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

const SignupVolunteer = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckApproval = async () => {
    setError(null);
    setChecking(true);
    try {
      const normalized = email.trim().toLowerCase();
      const q = query(collection(db, "pendingVolunteers"), where("email", "==", normalized), where("status", "==", "approved"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setApproved(false);
        toast({ title: "Not approved yet", description: "Please submit the volunteer form and wait for admin approval.", variant: "destructive" });
      } else {
        setApproved(true);
        toast({ title: "Approved", description: "We found your approved volunteer application. You can sign up now." });
      }
    } catch (e: any) {
      setError(e?.message || "Could not verify approval status. Please try again.");
      setApproved(null);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!approved) {
      toast({ title: "Approval required", description: "Your email must be approved as a volunteer before signing up.", variant: "destructive" });
      return;
    }
    try {
      const profile = await signUpWithEmail(email.trim(), password, "companion", name, phone.trim() || undefined);
      const redirectTo = requireRoleRedirectPath(profile.role);
      navigate(redirectTo);
    } catch (err: any) {
      const msg = String(err?.code || err?.message || "");
      if (msg.includes("auth/email-already-in-use")) {
        setError("That email is already registered. Please sign in instead.");
      } else {
        setError(err?.message || "Signup failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="bg-primary flex items-center justify-center p-4 py-6">
        <Card className="w-full max-w-md bg-primary border-none shadow-none">
          <CardContent className="p-4 space-y-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logo} alt="ElderEase" className="h-8 w-8" />
              <span className="text-lg font-bold text-primary-foreground">ElderEase</span>
            </Link>

            <h1 className="text-xl font-bold text-primary-foreground">Volunteer Signup</h1>
            <p className="text-primary-foreground/80 text-xs">Only approved volunteers can sign up. Please verify your email first.</p>

            <div className="space-y-2">
              <label className="block text-primary-foreground text-xs">Volunteer Email</label>
              <div className="flex gap-2">
                <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9" />
                <Button type="button" onClick={handleCheckApproval} disabled={!email || checking} className="h-9 bg-primary-dark hover:bg-primary-dark/90">
                  {checking ? "Checking..." : "Check"}
                </Button>
              </div>
              {approved === false && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-50 text-amber-900 p-4 text-sm shadow-sm">
                  <div className="font-semibold mb-1">Volunteer approval required</div>
                  <p className="opacity-90">This email is not approved yet. Please complete the volunteer form and wait for admin approval.</p>
                  <div className="mt-3">
                    <Link
                      to="/"
                      onClick={() => { localStorage.setItem("scrollTarget", "volunteer"); }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Go to Volunteer Form
                    </Link>
                  </div>
                </div>
              )}
              {approved && (
                <div className="text-green-100 bg-green-500/20 border border-green-500/30 rounded px-3 py-2 text-xs" role="status">
                  Approved! Complete your account details below.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-50 text-amber-900 p-3 text-sm shadow-sm" role="alert">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-primary-foreground text-xs mb-1">Full Name</label>
                <Input type="text" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9" />
              </div>
              <div>
                <label className="block text-primary-foreground text-xs mb-1">Phone</label>
                <Input type="tel" placeholder="e.g., +63 912 345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9" />
              </div>
              <div>
                <label className="block text-primary-foreground text-xs mb-1">Password</label>
                <Input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-primary-foreground/80">By signing up you agree to the</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm underline text-primary-foreground">volunteer terms & policy</button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Volunteer Terms & Policy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p><strong>Code of Conduct:</strong> Volunteers agree to be punctual, respectful, and uphold client dignity at all times.</p>
                      <p><strong>Scope:</strong> Non-medical assistance only (companionship, errands, light housekeeping). No medical procedures.</p>
                      <p><strong>Privacy:</strong> Do not disclose client information outside the service. Use the platform for communications.</p>
                      <p><strong>Safety:</strong> Report concerns to admins immediately. Follow provided safety guidelines.</p>
                      <p><strong>Scheduling:</strong> Honor accepted requests. Notify admins promptly if you must reschedule.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Button type="submit" className="w-full bg-primary-dark hover:bg-primary-dark/90 text-primary-dark-foreground h-9" disabled={!approved}>Create Volunteer Account</Button>

              <p className="text-center text-primary-foreground/80 text-xs">
                Not a volunteer? <Link to="/signup" className="underline text-primary-foreground">Sign up as Elder/Guardian</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block relative">
        <img src={authBg} alt="Tropical leaves" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default SignupVolunteer;


