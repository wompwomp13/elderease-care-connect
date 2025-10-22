import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import TrustSection from "@/components/sections/TrustSection";
import TeamSection from "@/components/sections/TeamSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FAQChatbotSection from "@/components/sections/FAQChatbotSection";
import NotificationsSection from "@/components/sections/NotificationsSection";
import ContactSection from "@/components/sections/ContactSection";
import VolunteerSection from "@/components/sections/VolunteerSection";
import AboutSection from "@/components/sections/AboutSection";
import Footer from "@/components/sections/Footer";
import { useEffect, useState } from "react";
import { subscribeToAuth, type AuthProfile } from "@/lib/auth";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<AuthProfile | null>(null);
  useEffect(() => {
    const unsub = subscribeToAuth(setCurrentUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const targetId = (window.location.hash ? window.location.hash.substring(1) : null) || localStorage.getItem("scrollTarget");
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    localStorage.removeItem("scrollTarget");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <TrustSection />
      <TeamSection />
      <TestimonialsSection />
      <FAQChatbotSection />
      <NotificationsSection />
      <ContactSection />
      <div id="volunteer">
        <VolunteerSection />
      </div>
      <AboutSection />
      <Footer />
    </div>
  );
};

export default Index;
