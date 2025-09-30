import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-[600px] flex items-center bg-gradient-to-br from-primary/10 via-background to-accent/20">
      <div className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
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
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop" 
              alt="Healthcare professional" 
              className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
