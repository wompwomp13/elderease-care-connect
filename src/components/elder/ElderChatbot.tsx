import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Minimize2 } from "lucide-react";
import { useChatVolunteers, type ChatVolunteer } from "@/hooks/use-chat-volunteers";

type ChatMessage = {
  type: "bot" | "user";
  message: string;
  time: string;
};

const faqShortcuts: { label: string; query: string }[] = [
  { label: "Services you offer", query: "What services does ElderEase offer?" },
  { label: "How to schedule", query: "How do I request or schedule a visit?" },
  { label: "Pricing", query: "How does pricing and demand work for services?" },
  { label: "Volunteer safety", query: "Are ElderEase volunteers background-checked and trusted?" },
  { label: "Contacting volunteers", query: "How do I contact or choose a volunteer?" },
  { label: "Service areas", query: "Where are ElderEase services available?" },
  { label: "Same volunteer", query: "Can I request the same volunteer again?" },
  { label: "Rescheduling", query: "How do I change or cancel a pending request?" },
  { label: "Same-day help", query: "Do you offer same-day services or urgent help?" },
  { label: "Payments", query: "How do payments or receipts work on ElderEase?" },
];

const apiBase =
  (import.meta as any).env?.VITE_CHATBOT_API_URL ||
  (import.meta as any).env?.CHATBOT_API_URL ||
  "http://localhost:4000";

const ElderChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "bot",
      message:
        "Hi! I’m ElderEase Assistant. I can help you with our services, volunteers, pricing, and how to use this website.\n\nYou can ask in your own words, or type a number (1–10) to use a shortcut topic:\n1. Services we offer\n2. How to schedule\n3. Pricing\n4. Volunteer safety\n5. Contacting volunteers\n6. Service areas\n7. Same volunteer again\n8. Change or cancel a request\n9. Same‑day help\n10. Payments and receipts",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const volunteers = useChatVolunteers();

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  const resolveInputQuery = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    const num = parseInt(trimmed, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= faqShortcuts.length) {
      return faqShortcuts[num - 1]?.query || trimmed;
    }
    return trimmed;
  };

  const sendToChatbot = async (userText: string, history: ChatMessage[]) => {
    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText, history }),
      });

      if (!res.ok) {
        throw new Error("Network error");
      }

      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.error && !data.reply) {
        throw new Error(data.error);
      }

      const reply =
        data.reply ||
        "I’m sorry, I’m having trouble answering right now. Please try again in a little while, or check the ElderEase pages for more details.";

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message:
            "I’m having trouble connecting right now. Please check your internet connection and try again, or use the ElderEase pages (Services, Browse, or Request Service) for more information.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const buildVolunteerReply = (question: string): string | null => {
    if (!volunteers || volunteers.length === 0) return null;
    const lower = question.toLowerCase();

    const extractTopCount = (): number | null => {
      const match = lower.match(/top\s+(\d+)/);
      if (!match) return null;
      const n = parseInt(match[1], 10);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    };

    const extractServiceFilter = (): string | null => {
      if (lower.includes("companionship")) return "Companionship";
      if (lower.includes("light housekeeping") || lower.includes("housekeeping"))
        return "Light Housekeeping";
      if (lower.includes("running errands") || lower.includes("errands"))
        return "Running Errands";
      if (lower.includes("home visits") || lower.includes("home visit") || lower.includes("visit"))
        return "Home Visits";
      return null;
    };

    const extractBottomCount = (): number | null => {
      const match = lower.match(/(worst|lowest)\s+(\d+)/);
      if (!match) return null;
      const n = parseInt(match[2], 10);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    };

    // General "top volunteers" / "best volunteers" questions
    if (
      (lower.includes("top") || lower.includes("best") || lower.includes("highest")) &&
      lower.includes("volunteer")
    ) {
      const rated = volunteers.filter(
        (v) => typeof v.avgRating === "number" && v.ratingCount > 0
      );
      let pool = rated.length > 0 ? rated : [...volunteers];

      const serviceFilter = extractServiceFilter();
      if (serviceFilter) {
        const filtered = pool.filter((v) => v.services?.includes(serviceFilter));
        if (filtered.length > 0) {
          pool = filtered;
        }
      }

      const sorted = [...pool].sort((a, b) => {
        const ar = a.avgRating ?? 0;
        const br = b.avgRating ?? 0;
        if (ar !== br) return br - ar;
        return (b.tasksCompleted ?? 0) - (a.tasksCompleted ?? 0);
      });
      const requested = extractTopCount();
      const count =
        requested && requested > 0 ? Math.min(requested, sorted.length) : Math.min(3, sorted.length);
      const top = sorted.slice(0, count);

      const lines = top.map((v) => {
        const ratingStr =
          typeof v.avgRating === "number"
            ? `${v.avgRating.toFixed(1)} out of 5`
            : "not yet rated";
        const tasksLabel =
          v.tasksCompleted > 0
            ? `${v.tasksCompleted} completed visit${v.tasksCompleted === 1 ? "" : "s"}`
            : "no confirmed visits yet";
        const services =
          v.services && v.services.length
            ? v.services.join(", ")
            : "services listed on their card";
        return `• ${v.fullName} – rating: ${ratingStr}, ${tasksLabel}. Services: ${services}.`;
      });

      return (
        `Here ${
          count === 1
            ? "is a volunteer on ElderEase with one of the strongest records"
            : "are some volunteers on ElderEase with strong records"
        }:\n\n` +
        lines.join("\n") +
        "\n\nYou can see more details on the Browse Services page, and choose a preferred volunteer when you make a request."
      );
    }

    // Questions about lowest-rated / least experienced volunteers.
    if (
      (lower.includes("lowest") || lower.includes("worst") || lower.includes("bottom") || lower.includes("least")) &&
      lower.includes("volunteer")
    ) {
      const rated = volunteers.filter(
        (v) => typeof v.avgRating === "number" && v.ratingCount > 0
      );
      let pool = rated.length > 0 ? rated : [...volunteers];

      const serviceFilter = extractServiceFilter();
      if (serviceFilter) {
        const filtered = pool.filter((v) => v.services?.includes(serviceFilter));
        if (filtered.length > 0) {
          pool = filtered;
        }
      }

      const sortedByRatingAsc = [...pool].sort((a, b) => {
        const ar = a.avgRating ?? 5;
        const br = b.avgRating ?? 5;
        if (ar !== br) return ar - br;
        return (a.tasksCompleted ?? 0) - (b.tasksCompleted ?? 0);
      });

      const requested = extractBottomCount();
      const count =
        requested && requested > 0
          ? Math.min(requested, sortedByRatingAsc.length)
          : Math.min(3, sortedByRatingAsc.length);
      const bottom = sortedByRatingAsc.slice(0, count);
      const lines = bottom.map((v) => {
        const ratingStr =
          typeof v.avgRating === "number"
            ? `${v.avgRating.toFixed(1)} out of 5`
            : "not yet rated";
        const tasksLabel =
          v.tasksCompleted > 0
            ? `${v.tasksCompleted} confirmed visit${v.tasksCompleted === 1 ? "" : "s"}`
            : "no confirmed visits yet";
        const services =
          v.services && v.services.length
            ? v.services.join(", ")
            : "services shown on their card";
        return `• ${v.fullName} – current rating: ${ratingStr}, ${tasksLabel}. Services: ${services}.`;
      });

      return (
        "Based on the current ratings on ElderEase, these volunteers presently have lower average scores. " +
        "This can change over time as they complete more visits and receive additional feedback:\n\n" +
        lines.join("\n") +
        "\n\nIf you are concerned about ratings, you can always choose someone with more visits or a higher score on the Browse Services page."
      );
    }

    // Specific volunteer questions by name (full or first name).
    const byFullName = volunteers.filter((v) =>
      lower.includes(v.fullName.toLowerCase())
    );

    let matches: ChatVolunteer[] = byFullName;

    if (matches.length === 0) {
      // Try first-name-only match when unambiguous.
      const firstNameMatches: ChatVolunteer[] = [];
      for (const v of volunteers) {
        const first = v.fullName.split(" ")[0]?.toLowerCase();
        if (!first) continue;
        if (lower.includes(first)) {
          firstNameMatches.push(v);
        }
      }
      // Only use first-name matches if there is a single clear match.
      if (firstNameMatches.length === 1) {
        matches = firstNameMatches;
      }
    }

    if (matches.length === 0) return null;

    const lines = matches.map((v) => {
      const ratingStr =
        typeof v.avgRating === "number"
          ? `${v.avgRating.toFixed(1)} out of 5`
          : "not yet rated";
      const tasksLabel =
        v.tasksCompleted > 0
          ? `${v.tasksCompleted} confirmed visit${v.tasksCompleted === 1 ? "" : "s"}`
          : "no confirmed visits yet";
      const services =
        v.services && v.services.length
          ? v.services.join(", ")
          : "services shown on their card";
      return (
        `${v.fullName} is a volunteer on ElderEase.\n` +
        `• Rating: ${ratingStr}\n` +
        `• Completed: ${tasksLabel}\n` +
        `• Services: ${services}`
      );
    });

    return (
      lines.join("\n\n") +
      "\n\nYou can confirm these details on the Browse Services page, where each volunteer card shows their services, rating, and completed visits."
    );
  };

  const buildPricingReply = (question: string): string | null => {
    const lower = question.toLowerCase();
    const looksLikePricingQuestion =
      lower.includes("price") ||
      lower.includes("pricing") ||
      lower.includes("how much") ||
      lower.includes("cost") ||
      lower.includes("rates") ||
      lower.includes("rate") ||
      lower.includes("fee") ||
      lower.includes("fees");

    if (!looksLikePricingQuestion) return null;

    const SERVICE_RATES: Record<string, number> = {
      Companionship: 150,
      "Light Housekeeping": 170,
      "Running Errands": 200,
      "Home Visits": 180,
    };

    // Try to detect a specific service + duration, e.g.
    // "companionship for 3 hours" or "3 hours of companionship"
    const service = (() => {
      if (lower.includes("companionship")) return "Companionship";
      if (lower.includes("light housekeeping") || lower.includes("housekeeping"))
        return "Light Housekeeping";
      if (lower.includes("running errands") || lower.includes("errands"))
        return "Running Errands";
      if (lower.includes("home visits") || lower.includes("home visit") || lower.includes("visit"))
        return "Home Visits";
      return null;
    })();

    const hoursMatch =
      lower.match(/(\d+(\.\d+)?)\s*hours?/) ||
      lower.match(/hours?\s*for\s*(\d+(\.\d+)?)/) ||
      lower.match(/for\s*(\d+(\.\d+)?)\s*hours?/);

    if (service && hoursMatch) {
      const numStr = hoursMatch[1];
      const hours = parseFloat(numStr);
      const rate = SERVICE_RATES[service] ?? 0;
      if (Number.isFinite(hours) && hours > 0 && rate > 0) {
        const base = rate * hours;
        const fee = base * 0.05;
        const subtotal = base + fee;
        const fmt = (v: number) => `₱${v.toFixed(2)}`;

        return (
          `For ${hours} hour${hours === 1 ? "" : "s"} of ${service}, ElderEase would start with:\n\n` +
          `• Base service cost: ${fmt(base)} (${fmt(rate)} × ${hours} hour${hours === 1 ? "" : "s"})\n` +
          `• Service fee (5%): ${fmt(fee)}\n\n` +
          `So before any dynamic adjustment, the estimated total would be about ${fmt(subtotal)}.\n\n` +
          "When your request is assigned to a volunteer, ElderEase may apply a small dynamic pricing adjustment " +
          "based on demand and the volunteer’s performance. The exact final total will appear in your receipt under Notifications."
        );
      }
    }

    const baseLines = [
      "• Companionship – ₱150 per hour",
      "• Light Housekeeping – ₱170 per hour",
      "• Running Errands – ₱200 per hour",
      "• Home Visits – ₱180 per hour",
    ];

    return (
      "ElderEase uses simple base hourly rates in Philippine pesos (PHP), and then applies a small dynamic adjustment when needed.\n\n" +
      "Current base rates are:\n" +
      baseLines.join("\n") +
      "\n\nWhen you submit a request, ElderEase calculates your total by:\n" +
      "• Multiplying each selected service by the number of hours you chose\n" +
      "• Adding a small 5% service fee\n" +
      "• Optionally applying a dynamic pricing adjustment when demand is high or a volunteer has a very strong performance record\n\n" +
      "The exact total for your request, including any dynamic adjustment and the 5% fee, will appear in your receipt under Notifications after a volunteer is assigned."
    );
  };

  const handleSend = () => {
    const rawInput = inputValue.trim();
    if (!rawInput || isSending) return;

    const resolved = resolveInputQuery(rawInput);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const history: ChatMessage[] = [
      ...messages,
      {
        type: "user",
        message: resolved,
        time: now,
      },
    ];

    setMessages(history);
    setInputValue("");

    // If this looks like a volunteer-specific question and we have
    // matching volunteers from Firebase, answer locally to avoid
    // any hallucinated names or ratings.
    const volunteerReply = buildVolunteerReply(resolved);
    if (volunteerReply) {
      const replyTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message: volunteerReply,
          time: replyTime,
        },
      ]);
      setIsTyping(false);
      setIsSending(false);
      return;
    }

    const pricingReply = buildPricingReply(resolved);
    if (pricingReply) {
      const replyTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          message: pricingReply,
          time: replyTime,
        },
      ]);
      setIsTyping(false);
      setIsSending(false);
      return;
    }

    setIsTyping(true);
    setIsSending(true);
    void sendToChatbot(resolved, history);
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
                <p className="text-white/80 text-xs">
                  Online • Answers about ElderEase services and this website
                </p>
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
          <div
            ref={scrollRef}
            className="bg-gradient-to-b from-secondary/30 to-secondary/50 p-4 h-[360px] overflow-y-auto space-y-3"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 shadow ${
                    m.type === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-white border text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{m.message}</p>
                  <p
                    className={`text-[10px] mt-1 text-right ${
                      m.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2 shadow">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    />
                    <span
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="bg-card p-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about services, volunteers, or this website..."
                className="flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <Button
                size="icon"
                className="rounded-full"
                onClick={handleSend}
                aria-label="Send"
                disabled={isSending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              I can only answer questions about ElderEase, our services, volunteers, and how to use this site.
            </p>
          </div>
        </section>
      )}
    </>
  );
};

export default ElderChatbot;


