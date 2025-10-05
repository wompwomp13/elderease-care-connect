import { Card } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const sampleChat = [
  {
    type: "bot",
    message: "Hi there! 👋 I'm ElderEase Assistant. How can I help you today?",
    time: "10:30 AM"
  },
  {
    type: "user",
    message: "What services do you offer?",
    time: "10:31 AM"
  },
  {
    type: "bot",
    message: "We offer comprehensive companion services including:\n• Daily companionship and conversation\n• Medication reminders\n• Light housekeeping\n• Meal preparation\n• Transportation assistance\n\nWould you like to know more about any specific service?",
    time: "10:31 AM"
  },
  {
    type: "user",
    message: "How do I schedule a visit?",
    time: "10:32 AM"
  },
  {
    type: "bot",
    message: "Scheduling is easy! You can:\n1. Call us at (555) 123-4567\n2. Fill out our contact form below\n3. Or I can connect you with our scheduling team right now!\n\nWhat works best for you?",
    time: "10:32 AM"
  }
];

const FAQChatbotSection = () => {
  return (
    <section id="ai-chatbot" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">24/7 AI Assistant</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Got Questions? Ask Away!
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our intelligent chatbot is here to help you anytime, answering your questions about our services instantly.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="overflow-hidden shadow-2xl border-border/50">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">ElderEase Assistant</h3>
                <p className="text-white/80 text-sm">Online • Typically replies instantly</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-gradient-to-b from-secondary/30 to-secondary/50 p-6 h-[400px] overflow-y-auto space-y-4">
              {sampleChat.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                      chat.type === "user"
                        ? "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground rounded-br-sm"
                        : "bg-white border border-border/50 text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line font-medium">{chat.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        chat.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {chat.time}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              <div className="flex justify-start">
                <div className="bg-white border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="bg-card p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your question here..."
                  className="flex-1"
                  disabled
                />
                <Button size="icon" className="rounded-full" disabled>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is a preview. The chatbot will be fully functional soon!
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQChatbotSection;