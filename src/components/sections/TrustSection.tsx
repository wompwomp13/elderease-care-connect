import { Button } from "@/components/ui/button";

const TrustSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="bg-primary-dark text-primary-dark-foreground rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-12 flex flex-col justify-center">
              <Button variant="secondary" size="sm" className="w-fit mb-6 rounded-full">
                Manage your Schedule
              </Button>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Trust us to be there to help and make things well again.
              </h2>
            </div>
            <div className="h-full min-h-[400px]">
              <img 
                src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&h=600&fit=crop" 
                alt="Care provider with senior" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
