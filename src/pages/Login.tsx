import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-background.jpg";
import { loginWithEmail, requireRoleRedirectPath } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const profile = await loginWithEmail(email.trim(), password);
      const redirectTo = requireRoleRedirectPath(profile.role);
      navigate(redirectTo);
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
        setError("Incorrect email or password. Please try again.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left side - Form */}
      <div className="bg-primary flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-primary border-none shadow-none">
          <CardContent className="p-6">
            <Link to="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <img src={logo} alt="ElderEase" className="h-10 w-10" />
              <span className="text-xl font-bold text-primary-foreground">ElderEase</span>
            </Link>

            <h1 className="text-2xl font-bold text-primary-foreground mb-1">Welcome back!</h1>
            <p className="text-primary-foreground/80 mb-6 text-sm">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-50 text-amber-900 p-3 text-sm shadow-sm" role="alert">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-primary-foreground text-sm mb-2">Email</label>
                <Input 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  aria-label="Email"
                />
              </div>

              <div>
                <label className="block text-primary-foreground text-sm mb-2">Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  aria-label="Password"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" className="border-primary-foreground" />
                <label htmlFor="remember" className="text-sm text-primary-foreground">
                  Remember for 30 days
                </label>
              </div>

              <Button type="submit" className="w-full bg-primary-dark hover:bg-primary-dark/90 text-primary-dark-foreground">
                Login
              </Button>

              

              <div className="text-center text-primary-foreground/80 text-sm mt-4 space-y-2">
                <p>Don't have an account?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link to="/signup" className="underline font-semibold">Sign Up as Elder/Guardian</Link>
                  <Link to="/signup/volunteer" className="underline font-semibold">Sign Up as Volunteer</Link>
                </div>
              </div>
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

export default Login;
