import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Minimize2 } from "lucide-react";

type ChatMessage = {
  type: "bot" | "user";
  message: string;
  time: string;
};

const faqData = [
  { 
    question: "What services do you offer?",
    answer: "We offer comprehensive companion services including:\n• Daily companionship and conversation\n• Light housekeeping\n• Running errands and shopping\n• Home visits and check-ins\n• Socialization activities and outings",
  },
  {
    question: "How do I schedule a visit?",
    answer: "Scheduling is easy! You can:\n1. Use Request Service in your menu\n2. We will confirm within 2 hours\n3. You’ll see updates in Notifications",
  },
  {
    question: "How much do services cost?",
    answer: "Transparent pricing per hour (plus 5% service fee):\n• Companionship: ₱150/hr\n• Light Housekeeping: ₱170/hr\n• Running Errands: ₱200/hr\n• Home Visits: ₱180/hr\n• Socialization: ₱230/hr",
  },
  {
    question: "Are your volunteers background-checked?",
    answer: "Yes. All volunteers are screened, reference-checked, trained, and monitored for quality.",
  },
  {
    question: "How to contact a volunteer?",
    answer: "Once assigned, you’ll receive contact details. Volunteers also reach out 24 hours before a visit.",
  },
  {
    question: "What areas do you serve?",
    answer: "We’re expanding. Check the platform for availability or ask us directly here!",
  },
  {
    question: "Can I request the same volunteer?",
    answer: "Absolutely. You can request a preferred volunteer for future visits when scheduling.",
  },
  {
    question: "What if I need to reschedule?",
    answer: "You can reschedule via the Request Service page or message us here. Fees may apply if less than 24 hours.",
  },
  {
    question: "Do you offer same-day services?",
    answer: "Subject to volunteer availability. Ask here and we’ll try to help quickly.",
  },
  {
    question: "How do payments work?",
    answer: "Invoices are sent after service completion. Pay securely via card or bank transfer.",
  },
];

const ElderChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    type: "bot",
    message:
      "Hi! I’m ElderEase Assistant. I can help with services, pricing, and scheduling.\n\nType a number (1-10) for FAQs, or ask me anything!\n1. Services\n2. Schedule a visit\n3. Pricing\n4. Background checks\n5. Contacting volunteers\n6. Service areas\n7. Same volunteer\n8. Reschedule\n9. Same-day help\n10. Payments",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  const handleSend = () => {
    const input = inputValue.trim();
    if (!input) return;
    setMessages((prev) => [...prev, { type: "user", message: input, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setInputValue("");
    setIsTyping(true);
    setTimeout(() => {
      const num = parseInt(input, 10);
      let botResponse: string;
      if (!Number.isNaN(num) && num >= 1 && num <= 10) {
        const faq = faqData[num - 1];
        botResponse = `${faq.question}\n\n${faq.answer}\n\n—\nType another number (1-10), or ask me anything!`;
      } else {
        botResponse = "I can help with scheduling, pricing, and services. Type 1-10 for FAQs or ask your question!";
      }
      setMessages((prev) => [...prev, { type: "bot", message: botResponse, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {/* Floating button - hidden when panel is open */}
      {!isOpen && (
        <button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
          aria-label={"Open chat with ElderEase Assistant"}
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <section className="fixed bottom-6 right-6 w-80 sm:w-96 bg-card text-card-foreground rounded-xl shadow-2xl border flex flex-col overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">ElderEase Assistant</h3>
                <p className="text-white/80 text-xs">Online • Typically replies instantly</p>
              </div>
            </div>
            <button
              className="p-2 rounded-md hover:bg-white/10 text-white"
              aria-label="Minimize chat"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="bg-gradient-to-b from-secondary/30 to-secondary/50 p-4 h-[360px] overflow-y-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow ${m.type === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white border text-foreground rounded-bl-sm"}`}>
                  <p className="text-sm whitespace-pre-line">{m.message}</p>
                  <p className={`text-[10px] mt-1 text-right ${m.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2 shadow">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="bg-card p-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a number (1-10) or your question..."
                className="flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button size="icon" className="rounded-full" onClick={handleSend} aria-label="Send">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Type 1-10 to see FAQs instantly</p>
          </div>
        </section>
      )}
    </>
  );
};

export default ElderChatbot;


