import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Navbar = () => {
  return (
    <nav className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="ElderEase Logo" className="h-10 w-10" />
          <span className="text-xl font-bold">ElderEase</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#home" className="hover:opacity-80 transition-opacity">Home</a>
          <a href="#about" className="hover:opacity-80 transition-opacity">About</a>
          <a href="#services" className="hover:opacity-80 transition-opacity">Services</a>
          <a href="#ai-chatbot" className="hover:opacity-80 transition-opacity">AI Chatbot</a>
          <a href="#testimonials" className="hover:opacity-80 transition-opacity">Testimonials</a>
          <a href="#contact" className="hover:opacity-80 transition-opacity">Contact</a>
          <Link to="/login">
            <Button variant="nav" size="sm">Login</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
