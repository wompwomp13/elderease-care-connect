import { Info } from "lucide-react";
import about1 from "@/assets/about-1.png";
import about2 from "@/assets/about-2.png";

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Info className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">About ElderEase</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Our Story</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-6xl mx-auto">
          <div className="overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src={about1} 
              alt="Elder care" 
              className="w-full h-[300px] object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src={about2} 
              alt="Compassionate care" 
              className="w-full h-[300px] object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <p className="text-lg text-foreground leading-relaxed">
            At <span className="font-bold text-primary">ElderEase</span>, we believe every senior deserves comfort, care, and companionship. Our mission is to 
            support families in Ambiong, Baguio by providing a safe and simple digital space where their loved 
            ones can feel connected and valued.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            Through our <span className="font-semibold text-primary">AI Companion FAQ Chatbot</span>, ElderEase offers friendly conversations, memory sharing, ask 
            about features of the website and gentle encouragement to brighten the everyday lives of seniors. 
            For families and guardians, it provides peace of mind knowing their elders are engaged, supported, 
            and never alone.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            We combine <span className="font-semibold text-primary">technology with compassion</span>—making it easier for seniors to enjoy meaningful 
            interactions while giving families the assurance that their loved ones are cared for, anytime and 
            anywhere.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
