import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-companion.png";

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
        <div className="max-w-2xl">
          <p className="text-primary font-medium mb-4">Senior Citizen Companion Website</p>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            A Friendly<br />
            Companion<br />
            provider.
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Excepteur sint occaecat cupidatat non proident sunt officia
          </p>
          <Button variant="hero" size="lg" className="rounded-full">
            Read our facts →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
