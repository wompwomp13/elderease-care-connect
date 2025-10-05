import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-companion.png";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image with Low Opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-background/20"></div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-primary font-medium mb-4"
          >
            Senior Citizen Companion Website
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight"
          >
            A Friendly<br />
            Companion<br />
            provider.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-muted-foreground text-lg mb-8"
          >
            Excepteur sint occaecat cupidatat non proident sunt officia
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Button variant="hero" size="lg" className="rounded-full" asChild>
              <a href="#team">Meet our team →</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
