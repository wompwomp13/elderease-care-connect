import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import companionshipImage from "@/assets/elder-companionship.jpg";
import { useMemo, useRef, useState, useEffect } from "react";
import { HeartHandshake, ShoppingBasket, Home, Users, Calendar, Bell, MessageSquare, Sparkles, TrendingUp } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Welcome Back!</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Hello, <span className="text-primary">{greetingName}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Your personal companion network is here to brighten your day with friendly support, engaging activities, and helpful assistance.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2">
                  <Calendar className="h-5 w-5" />
                  View Schedule
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <HeartHandshake className="h-5 w-5" />
                  Request Service
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
              <img src={companionshipImage} alt="Companionship" className="relative rounded-3xl shadow-2xl w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Today</span>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Next Visit</h3>
            <p className="text-2xl font-bold">3:00 PM</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">1</span>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">New Messages</h3>
            <p className="text-2xl font-bold">Unread</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-2xl border border-green-500/20">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">This Week</h3>
            <p className="text-2xl font-bold">5 Activities</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Support */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Next Support</h2>
                <span className="text-sm font-medium text-primary">Today, 3:00 PM</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center flex-shrink-0">
                  <HeartHandshake className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Friendly Companionship</h3>
                  <p className="text-sm text-muted-foreground mb-3">Volunteer Sam • 1 hour • At your home</p>
                  <div className="flex gap-3">
                    <Button size="sm" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">Reschedule</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Grid */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">Available Services</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="group p-4 rounded-xl border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">Social Activities</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Join local events and group outings</p>
                </div>

                <div className="group p-4 rounded-xl border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <ShoppingBasket className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Grocery Assistance</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Help with shopping and deliveries</p>
                </div>

                <div className="group p-4 rounded-xl border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                      <Home className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Light Housekeeping</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Keep your space tidy and comfortable</p>
                </div>

                <div className="group p-4 rounded-xl border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                      <HeartHandshake className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Home Visits</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Regular check-ins and support</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Request a service">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Request a Service</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="View schedule">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>View Schedule</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Check notifications">
                  <Bell className="h-5 w-5 text-green-600" />
                  <span>Notifications</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" aria-label="Message companion">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <span>Message Companion</span>
                </Button>
              </div>
            </div>

            {/* Helpful Tips */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Helpful Tips</h2>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Prepare a short list of tasks before your volunteer arrives</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Keep your shopping list handy and up to date</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Use the chat button anytime you have questions</span>
                </li>
              </ul>
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


