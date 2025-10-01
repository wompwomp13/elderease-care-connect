import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, ArrowRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Amber Morales",
    text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore sunt culpa officia.",
    fullText: "Duis aute irure dolor in reprehenderit in voluptate velit culpa dolore fugiat nulla pariatur exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute eu laborum."
  },
  {
    name: "Amber Morales",
    text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore sunt culpa officia.",
    fullText: "Duis aute irure dolor in reprehenderit in voluptate velit culpa dolore fugiat nulla pariatur exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute eu laborum."
  }
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Star className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Testimonials</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">What Families Say</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real stories from families who have experienced the difference our care makes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-primary/10 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <Quote className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{testimonial.name}</h4>
                    <div className="flex gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-foreground mb-3">{testimonial.text}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{testimonial.fullText}</p>
              </CardContent>
            </Card>
          ))}
          
          <Card className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground border-none shadow-2xl hover:shadow-3xl transition-shadow">
            <CardContent className="p-8 text-center flex flex-col justify-center h-full">
              <h3 className="text-2xl font-bold mb-4">Share Your Experience</h3>
              <p className="mb-6 opacity-90 text-lg">
                Help others discover the quality care their loved ones deserve
              </p>
              <Button variant="secondary" size="lg" className="rounded-full mx-auto">
                Post Testimonial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
