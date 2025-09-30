import { Facebook, Linkedin, Twitter } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-primary-dark text-primary-dark-foreground py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="ElderEase" className="h-10 w-10" />
              <span className="text-xl font-bold">ElderEase</span>
            </div>
            <p className="text-sm opacity-80 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit sed laborum magna aliqua.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#about" className="hover:opacity-100">Our Team</a></li>
              <li><a href="#contact" className="hover:opacity-100">Appointment</a></li>
              <li><a href="#contact" className="hover:opacity-100">Contact Us</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-dark-foreground/20 pt-6 text-center text-sm opacity-60">
          <p>&copy; 2025 ElderEase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
