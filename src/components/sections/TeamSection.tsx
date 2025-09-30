import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const team = [
  {
    name: "Harry Louise Metro",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&h=300&fit=crop"
  },
  {
    name: "Actrcee Delos Santos",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop"
  },
  {
    name: "Mavi Angel Caling",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop"
  }
];

const TeamSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Meet Our Team</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore fugiat sunt culpa officia deserunt mollit anim eu laborum.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {team.map((member, index) => (
            <Card key={index} className="border-2 border-primary/20 hover:border-primary transition-all duration-300 hover:shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src={member.image} 
                  alt={member.name} 
                  className="w-full h-64 object-cover"
                />
                <div className="p-6 text-center">
                  <h4 className="font-semibold text-primary-dark">{member.name}</h4>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-primary text-primary-foreground text-center border-none shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-4">Join Our Team</h3>
              <p className="mb-6 text-sm opacity-90">
                Lorem ipsum dolor amet, consectetur adipiscing elit sed intermod tempor
              </p>
              <Button variant="secondary" className="rounded-full">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
