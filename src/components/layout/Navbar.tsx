import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const location = useLocation();
  const isActive = (hash: string) => location.pathname === "/" && location.hash === hash;
  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="ElderEase Logo" className="h-10 w-10" />
          <span className="text-xl font-bold">ElderEase</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#home" className={`transition-opacity ${isActive("#home") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Home</a>
          <a href="#about" className={`transition-opacity ${isActive("#about") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>About</a>
          <a href="#services" className={`transition-opacity ${isActive("#services") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Services</a>
          <a href="#ai-chatbot" className={`transition-opacity ${isActive("#ai-chatbot") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>AI Chatbot</a>
          <a href="#testimonials" className={`transition-opacity ${isActive("#testimonials") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Testimonials</a>
          <a href="#contact" className={`transition-opacity ${isActive("#contact") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Contact</a>
          <Link to="/login">
            <Button variant="nav" size="sm">Login</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
