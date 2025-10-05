import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-background.jpg";
import { loginWithCredentials, requireRoleRedirectPath, getAllFakeUsers } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const user = loginWithCredentials(username.trim(), password);
    if (!user) {
      setError("Invalid credentials. Use one of the demo accounts below.");
      return;
    }
    const redirectTo = requireRoleRedirectPath(user.role);
    navigate(redirectTo);
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
                <div className="text-red-100 bg-red-500/20 border border-red-500/30 rounded px-3 py-2 text-sm" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-primary-foreground text-sm mb-2">Username</label>
                <Input 
                  type="text" 
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  aria-label="Username"
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

              <div className="rounded-md bg-primary-foreground/5 p-3 border border-primary-foreground/10" aria-live="polite">
                <p className="text-xs text-primary-foreground/80 mb-1">Demo accounts:</p>
                <ul className="text-xs text-primary-foreground/90 space-y-1 list-disc pl-4">
                  {getAllFakeUsers().map((u) => (
                    <li key={u.id}>
                      <span className="font-semibold">{u.role}</span>: <span className="font-mono">{u.username}</span> / <span className="font-mono">{u.password}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-center text-primary-foreground/80 text-sm mt-4">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary-foreground font-semibold underline">
                  Sign Up
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

export default Login;
