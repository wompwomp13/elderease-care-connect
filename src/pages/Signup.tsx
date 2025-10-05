import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-background.jpg";

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For prototype, just navigate to home
    navigate("/");
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

            <h1 className="text-2xl font-bold text-primary-foreground mb-6">Get Started Now</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-primary-foreground text-sm mb-2">Name</label>
                <Input 
                  type="text" 
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                />
              </div>

              <div>
                <label className="block text-primary-foreground text-sm mb-2">Email address</label>
                <Input 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                />
              </div>

              <div>
                <label className="block text-primary-foreground text-sm mb-2">Phone number</label>
                <Input 
                  type="tel" 
                  placeholder="Enter your number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
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
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="terms" className="border-primary-foreground" />
                <label htmlFor="terms" className="text-sm text-primary-foreground">
                  I agree to the terms & policy
                </label>
              </div>

              <Button type="submit" className="w-full bg-primary-dark hover:bg-primary-dark/90 text-primary-dark-foreground">
                Signup
              </Button>

              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-primary-foreground/20"></div>
                <span className="text-primary-foreground/60 text-xs">OR</span>
                <div className="flex-1 h-px bg-primary-foreground/20"></div>
              </div>

              <Button variant="outline" className="w-full bg-white border-primary-foreground/20 text-foreground hover:bg-white/90">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </Button>

              <p className="text-center text-primary-foreground/80 text-sm mt-4">
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
