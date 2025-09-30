import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, ArrowRight } from "lucide-react";

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
    <section id="testimonials" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Users Testimonials</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore fugiat sunt culpa officia deserunt mollit anim eu laborum.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Quote className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-foreground mb-2">{testimonial.text}</p>
                <p className="text-sm text-muted-foreground">{testimonial.fullText}</p>
              </CardContent>
            </Card>
          ))}
          
          <Card className="bg-primary text-primary-foreground border-none shadow-xl">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-4">Post Your Testimonials</h3>
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

export default TestimonialsSection;
