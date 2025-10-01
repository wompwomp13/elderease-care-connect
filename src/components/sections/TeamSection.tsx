import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import harryImage from "@/assets/team-harry.jpg";
import actreceImage from "@/assets/team-actrece.png";
import maviImage from "@/assets/team-mavi.png";

const team = [
  {
    name: "Harry Louise Metro",
    image: harryImage
  },
  {
    name: "Actrcee Delos Santos",
    image: actreceImage
  },
  {
    name: "Mavi Angel Caling",
    image: maviImage
  }
];

const TeamSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Our Team</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Meet Our Caring Team</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dedicated professionals committed to providing exceptional care and companionship to your loved ones.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {team.map((member, index) => (
            <Card key={index} className="border-2 border-primary/20 hover:border-primary transition-all duration-300 hover:shadow-2xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6 text-center bg-gradient-to-b from-background to-secondary/20">
                  <h4 className="font-bold text-primary-dark text-lg">{member.name}</h4>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-center border-none shadow-2xl hover:shadow-3xl transition-shadow">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Join Our Team</h3>
              <p className="mb-6 opacity-90">
                Be part of a caring community that makes a difference in seniors' lives every day
              </p>
              <Button variant="secondary" size="lg" className="rounded-full">
                Learn More <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
