const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-8">About Us</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-6xl mx-auto">
          <img 
            src="https://images.unsplash.com/photo-1516733968668-dbdce39c4651?w=600&h=400&fit=crop" 
            alt="Elder care" 
            className="rounded-2xl shadow-lg w-full h-[300px] object-cover"
          />
          <img 
            src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=600&h=400&fit=crop" 
            alt="Compassionate care" 
            className="rounded-2xl shadow-lg w-full h-[300px] object-cover"
          />
        </div>

        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <p className="text-lg text-foreground leading-relaxed">
            At ElderEase, we believe every senior deserves comfort, care, and companionship. Our mission is to 
            support families in Ambiong, Baguio by providing a safe and simple digital space where their loved 
            ones can feel connected and valued.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            Through our AI Companion FAQ Chatbot, ElderEase offers friendly conversations, memory sharing, ask 
            about features of the website and gentle encouragement to brighten the everyday lives of seniors. 
            For families and guardians, it provides peace of mind knowing their elders are engaged, supported, 
            and never alone.
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            We combine technology with compassion—making it easier for seniors to enjoy meaningful 
            interactions while giving families the assurance that their loved ones are cared for, anytime and 
            anywhere.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
