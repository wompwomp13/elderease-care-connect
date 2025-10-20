import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type ChatMessage = {
  type: "bot" | "user";
  message: string;
  time: string;
};

const faqData = [
  { 
    question: "What services do you offer?",
    answer: "We offer comprehensive companion services including:\n• Daily companionship and conversation\n• Light housekeeping\n• Running errands and shopping\n• Home visits and check-ins\n• Socialization activities and outings"
  },
  {
    question: "How do I schedule a visit?",
    answer: "Scheduling is easy! You can:\n1. Call us at (555) 123-4567\n2. Use our online booking system\n3. Fill out the request service form on our website\n\nOur team will confirm your appointment within 2 hours!"
  },
  {
    question: "How much do your services cost?",
    answer: "Our pricing is transparent and based on current demand:\n• Companionship: $25-35/hour\n• Light Housekeeping: $30-40/hour\n• Running Errands: $28-38/hour\n• Home Visits: $25-35/hour\n\nPrices adjust based on demand to ensure availability."
  },
  {
    question: "Are your volunteers background-checked?",
    answer: "Yes! All our volunteers undergo:\n• Comprehensive background checks\n• Reference verification\n• Professional training\n• Regular performance reviews\n\nYour safety and comfort are our top priorities."
  },
  {
    question: "How to contact a volunteer?",
    answer: "Once your service is confirmed:\n1. You'll receive volunteer contact info via email\n2. The volunteer will call you 24 hours before visit\n3. You can message them through our platform\n4. Emergency contact: (555) 123-4567"
  },
  {
    question: "What areas do you serve?",
    answer: "We currently serve the following areas:\n• Greater Springfield Metro\n• Shelbyville County\n• Capital City and surrounding towns\n\nExpanding to new areas regularly! Contact us to check if we serve your location."
  },
  {
    question: "Can I request the same volunteer?",
    answer: "Absolutely! If you connect well with a volunteer:\n• Request them for future visits\n• Set up recurring appointments\n• Build a consistent care relationship\n\nWe encourage continuity of care!"
  },
  {
    question: "What if I need to cancel or reschedule?",
    answer: "You can cancel or reschedule:\n• Up to 24 hours before: No charge\n• Less than 24 hours: $10 fee\n• Same day: $20 fee\n\nContact us immediately at (555) 123-4567"
  },
  {
    question: "Do you offer emergency services?",
    answer: "For urgent same-day requests:\n• Call (555) 123-4567\n• Available 7 days a week\n• Subject to volunteer availability\n• Additional fee may apply\n\nFor medical emergencies, always call 911 first."
  },
  {
    question: "How do payments work?",
    answer: "Payment is simple and secure:\n• Invoice sent after service completion\n• Pay by credit/debit card or bank transfer\n• Receipts provided for insurance/taxes\n• Payment due within 7 days\n\nWe accept all major credit cards!"
  }
];

const FAQChatbotSection = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "bot",
      message: "Hi there! 👋 I'm ElderEase Assistant. I can answer your questions!\n\nType a number (1-10) to see these FAQs:\n1. What services do you offer?\n2. How do I schedule a visit?\n3. How much do services cost?\n4. Are volunteers background-checked?\n5. How to contact a volunteer?\n6. What areas do you serve?\n7. Can I request the same volunteer?\n8. Cancel or reschedule policy?\n9. Do you offer emergency services?\n10. How do payments work?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const input = inputValue.trim();
    if (!input) return;

    const userMessage: ChatMessage = {
      type: "user",
      message: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const num = parseInt(input);
      let botResponse: string;

      if (num >= 1 && num <= 10) {
        const faq = faqData[num - 1];
        botResponse = `${faq.question}\n\n${faq.answer}\n\n---\n\nType another number (1-10) for more FAQs, or ask me anything!`;
      } else {
        botResponse = "Please type a number between 1-10 to see our FAQs, or feel free to ask your own question!\n\n1. Services\n2. Scheduling\n3. Pricing\n4. Background checks\n5. Contact volunteers\n6. Service areas\n7. Repeat volunteers\n8. Cancellation policy\n9. Emergency services\n10. Payments";
      }

      const botMessage: ChatMessage = {
        type: "bot",
        message: botResponse,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

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
              {messages.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
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
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="bg-card p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a number (1-10) or your question..."
                  className="flex-1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button size="icon" className="rounded-full" onClick={handleSend}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Type 1-10 to see FAQ answers instantly!
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQChatbotSection;