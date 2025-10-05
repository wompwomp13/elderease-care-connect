import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import { useMemo, useRef, useState, useEffect } from "react";
import { HeartHandshake, ShoppingBasket, Home, Users, Calendar, Bell, MessageSquare } from "lucide-react";

const ElderNavbar = () => {
  const user = getCurrentUser();
  return (
    <nav className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2" aria-label="ElderEase Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5" role="navigation" aria-label="Primary">
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Home" onClick={() => {}} onKeyDown={() => {}}>Home</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="My Schedule" onClick={() => {}} onKeyDown={() => {}}>My Schedule</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Request Service" onClick={() => {}} onKeyDown={() => {}}>Request Service</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Notifications" onClick={() => {}} onKeyDown={() => {}}>Notifications</button>
          <button className="hover:opacity-80 transition-opacity" tabIndex={0} aria-label="Profile" onClick={() => {}} onKeyDown={() => {}}>Profile</button>
          {user ? (
            <Button
              variant="nav"
              size="sm"
              onClick={() => { logout(); window.location.href = "/"; }}
              aria-label="Log out"
            >
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="nav" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

type ChatMessage = { id: string; sender: "bot" | "user"; text: string; time: string };

const ChatPanel = ({ isOpen, handleClose }: { isOpen: boolean; handleClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", sender: "bot", text: "Hello! I'm your ElderEase assistant.", time: "now" },
    { id: "m2", sender: "bot", text: "How can I help you today?", time: "now" },
  ]);
  const [pendingText, setPendingText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSendMessage = () => {
    if (!pendingText.trim()) return;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: pendingText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setPendingText("");
    const botReply: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "bot",
      text: "Thanks for your message! A companion can help with companionship, errands, and more.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTimeout(() => setMessages((prev) => [...prev, botReply]), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  if (!isOpen) return null;

  return (
    <section
      className="fixed bottom-24 right-6 w-80 sm:w-96 bg-card text-card-foreground rounded-xl shadow-2xl border flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Messenger chat window"
      tabIndex={0}
    >
      <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M2 12.5C2 7.81 6.03 4 11 4s9 3.81 9 8.5S15.97 21 11 21c-1.01 0-1.98-.14-2.88-.41-.2-.06-.42-.04-.6.05L4.1 21.78c-.7.35-1.48-.33-1.22-1.06l1.1-3.02c.07-.2.06-.43-.03-.62C2.56 15.69 2 14.15 2 12.5Z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">ElderEase Assistant</p>
            <p className="text-xs opacity-90">Online • Helpful & friendly</p>
          </div>
        </div>
        <button
          className="p-1 rounded hover:bg-white/10"
          aria-label="Close chat"
          tabIndex={0}
          onClick={handleClose}
          onKeyDown={(e) => { if (e.key === "Enter") handleClose(); }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3z"/>
          </svg>
        </button>
      </header>

      <div ref={scrollRef} className="px-3 py-3 space-y-2 max-h-80 overflow-y-auto bg-background">
        {messages.map((m) => (
          <div key={m.id} className={m.sender === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.sender === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 shadow"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 shadow"
              }
            >
              <p className="text-sm leading-relaxed">{m.text}</p>
              <p className="text-[10px] opacity-70 mt-1 text-right">{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-card border-t">
        <div className="flex items-center gap-2">
          <Input
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            aria-label="Type your message"
          />
          <Button
            aria-label="Send message"
            className="px-3"
            onClick={handleSendMessage}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
};

const ChatWidget = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => {
  return (
    <button
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      aria-label={isOpen ? "Close chat" : "Open chat with support bot"}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter") onToggle(); }}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <path fill="currentColor" d="M2 12.5C2 7.81 6.03 4 11 4s9 3.81 9 8.5S15.97 21 11 21c-1.01 0-1.98-.14-2.88-.41-.2-.06-.42-.04-.6.05L4.1 21.78c-.7.35-1.48-.33-1.22-1.06l1.1-3.02c.07-.2.06-.43-.03-.62C2.56 15.69 2 14.15 2 12.5Z"/>
        <circle cx="8.5" cy="12.5" r="1.25" fill="#fff"/>
        <circle cx="11" cy="12.5" r="1.25" fill="#fff"/>
        <circle cx="13.5" cy="12.5" r="1.25" fill="#fff"/>
      </svg>
    </button>
  );
};

const ElderHome = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const greetingName = user?.name ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <ElderNavbar />
      <main className="container mx-auto px-4 py-10">
        <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome, {greetingName}!</h1>
          <p className="text-muted-foreground mb-6">
            ElderEase connects you with compassionate volunteers for companionship, light housekeeping, errands,
            home visits, and social activities—all designed to make life easier and more joyful.
          </p>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Visit</p>
                <p className="text-2xl font-bold mt-1">Today</p>
              </div>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Messages</p>
                <p className="text-2xl font-bold mt-1">1</p>
              </div>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-background flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold mt-1">2</p>
              </div>
              <Bell className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Main grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Your Next Support</h2>
                  <span className="text-xs text-muted-foreground">Today, 3:00 PM</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
                    <HeartHandshake className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Friendly Companionship</p>
                    <p className="text-muted-foreground">Volunteer Sam • 1h • At your home</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="bg-primary hover:bg-primary/90" aria-label="View details">View Details</Button>
                  <Button size="sm" variant="outline" aria-label="Reschedule">Reschedule</Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-background">
                <h2 className="font-semibold mb-3">Recommended Services</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md border bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Social Activities</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Join local events and group outings.</p>
                  </div>
                  <div className="p-3 rounded-md border bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingBasket className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Grocery Assistance</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Help with shopping and deliveries.</p>
                  </div>
                  <div className="p-3 rounded-md border bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Light Housekeeping</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Keep your space tidy and comfortable.</p>
                  </div>
                  <div className="p-3 rounded-md border bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <HeartHandshake className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Home Visits</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Regular check-ins and support at home.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-background">
                <h2 className="font-semibold mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" aria-label="Request a service"><HeartHandshake className="h-4 w-4 mr-2" /> Request a Service</Button>
                  <Button variant="outline" size="sm" aria-label="View schedule"><Calendar className="h-4 w-4 mr-2" /> View Schedule</Button>
                  <Button variant="outline" size="sm" aria-label="Check notifications"><Bell className="h-4 w-4 mr-2" /> Check Notifications</Button>
                  <Button variant="outline" size="sm" aria-label="Message companion"><MessageSquare className="h-4 w-4 mr-2" /> Message Companion</Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-background">
                <h2 className="font-semibold mb-3">Helpful Tips</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Prepare a short list of tasks before your volunteer arrives.</li>
                  <li>For errands, keep your shopping list handy and up to date.</li>
                  <li>Use the chat button anytime you have a quick question.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
      <ChatWidget isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
      <ChatPanel isOpen={isChatOpen} handleClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default ElderHome;


