import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ContentManagement = () => {
  const { toast } = useToast();
  
  const [heroContent, setHeroContent] = useState({
    title: "Compassionate Care for Your Loved Ones",
    subtitle: "Professional elderly care services with a personal touch",
  });

  const [contactInfo, setContactInfo] = useState({
    email: "support@elderease.com",
    phone: "(555) 123-4567",
    address: "123 Care Street, City, State 12345",
  });

  const [testimonials, setTestimonials] = useState([
    {
      id: 1,
      name: "Margaret T.",
      text: "The companionship service has been wonderful for my mother.",
      rating: 5,
    },
    {
      id: 2,
      name: "John D.",
      text: "Professional and caring volunteers. Highly recommend!",
      rating: 5,
    },
  ]);

  const handleSave = (section: string) => {
    toast({
      title: "Content Updated",
      description: `${section} has been successfully updated.`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Management</h1>
          <p className="text-muted-foreground">Edit homepage sections, testimonials, and contact information</p>
        </div>

        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hero">Homepage</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          </TabsList>

          {/* Hero Section */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle>Homepage Hero Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-title">Main Title</Label>
                  <Input
                    id="hero-title"
                    value={heroContent.title}
                    onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-subtitle">Subtitle</Label>
                  <Textarea
                    id="hero-subtitle"
                    value={heroContent.subtitle}
                    onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={() => handleSave("Homepage content")} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email Address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone Number</Label>
                  <Input
                    id="contact-phone"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-address">Address</Label>
                  <Textarea
                    id="contact-address"
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={() => handleSave("Contact information")} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testimonials */}
          <TabsContent value="testimonials">
            <div className="space-y-4">
              {testimonials.map((testimonial, index) => (
                <Card key={testimonial.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">Testimonial {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input
                        value={testimonial.name}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[index].name = e.target.value;
                          setTestimonials(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Testimonial Text</Label>
                      <Textarea
                        value={testimonial.text}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[index].text = e.target.value;
                          setTestimonials(updated);
                        }}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rating (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={testimonial.rating}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[index].rating = parseInt(e.target.value);
                          setTestimonials(updated);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button onClick={() => handleSave("Testimonials")} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save All Testimonials
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ContentManagement;
