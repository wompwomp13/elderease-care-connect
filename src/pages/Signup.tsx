import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-background.jpg";
import { signUpWithEmail, requireRoleRedirectPath } from "@/lib/auth";

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role] = useState<"elderly">("elderly");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const profile = await signUpWithEmail(email.trim(), password, role, name, phone.trim() || undefined);
      const redirectTo = requireRoleRedirectPath(profile.role);
      navigate(redirectTo);
    } catch (err: any) {
      const msg = String(err?.code || err?.message || "");
      if (msg.includes("auth/email-already-in-use")) {
        setError("That email is already registered. Please sign in instead.");
      } else if (msg.includes("auth/weak-password")) {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (msg.includes("auth/invalid-email")) {
        setError("Invalid email format. Please check and try again.");
      } else {
        setError(err?.message || "Signup failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left side - Form */}
      <div className="bg-primary flex items-center justify-center p-4 py-6">
        <Card className="w-full max-w-md bg-primary border-none shadow-none">
          <CardContent className="p-4">
            <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
              <img src={logo} alt="ElderEase" className="h-8 w-8" />
              <span className="text-lg font-bold text-primary-foreground">ElderEase</span>
            </Link>

            <h1 className="text-xl font-bold text-primary-foreground mb-4">Elder/Guardian Signup</h1>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-50 text-amber-900 p-3 text-sm shadow-sm" role="alert">
                  <p className="font-medium">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-primary-foreground text-xs mb-1">Name</label>
                <Input 
                  type="text" 
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9"
                />
              </div>

              {/* Role selection removed for Elder/Guardian signup; defaults to elderly */}

              <div>
                <label className="block text-primary-foreground text-xs mb-1">Email address</label>
                <Input 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9"
                />
              </div>

              <div>
                <label className="block text-primary-foreground text-xs mb-1">Phone number</label>
                <Input 
                  type="tel" 
                  placeholder="e.g., +63 912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9"
                />
              </div>

              <div>
                <label className="block text-primary-foreground text-xs mb-1">Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 h-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="terms" className="border-primary-foreground" />
                <label htmlFor="terms" className="text-sm text-primary-foreground">
                  I agree to the
                </label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm underline text-primary-foreground">terms & policy</button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Terms & Policy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p><strong>Purpose:</strong> ElderEase connects elders/guardians with vetted volunteer companions for non-medical support.</p>
                      <p><strong>Safety:</strong> Volunteers are screened by admin. Elders/guardians should never share sensitive financial information.</p>
                      <p><strong>Scheduling:</strong> Appointments are requests until confirmed. Changes may occur due to volunteer availability.</p>
                      <p><strong>Privacy:</strong> We collect minimal information to provide services. Data is not sold to third parties.</p>
                      <p><strong>Liability:</strong> ElderEase is a coordination platform and is not liable for damages beyond the scope permitted by law.</p>
                      <p><strong>Conduct:</strong> Respectful behavior is required. Abuse or harassment may result in account suspension.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Button type="submit" className="w-full bg-primary-dark hover:bg-primary-dark/90 text-primary-dark-foreground h-9">
                Signup
              </Button>

              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-primary-foreground/20"></div>
                <span className="text-primary-foreground/60 text-xs">OR</span>
                <div className="flex-1 h-px bg-primary-foreground/20"></div>
              </div>

              <Button variant="outline" className="w-full bg-white border-primary-foreground/20 text-foreground hover:bg-white/90 h-9">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </Button>

              <p className="text-center text-primary-foreground/80 text-xs mt-3">
                Have an account?{" "}
                <Link to="/login" className="text-primary-foreground font-semibold underline">
                  Sign In
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Image */}
      <div className="hidden md:block relative">
        <img 
          src={authBg} 
          alt="Tropical leaves" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Signup;
