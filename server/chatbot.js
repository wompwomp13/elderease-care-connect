import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[ElderEase chatbot] OPENAI_API_KEY is not set. The chatbot API will respond with an error until it is configured."
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors({ origin: true }));
app.use(express.json());

// Knowledge base derived from Elder/Guardian pages and related sections.
// Keep this strictly aligned with on-site content.
const knowledgeBase = [
  {
    id: "site-overview-and-navigation",
    tags: ["elderease", "website", "home page", "navigation", "how to use", "guardian", "elder"],
    content:
      "ElderEase is a platform that helps elderly users and their guardians arrange support such as companionship, home visits, light housekeeping, running errands, and social activities. " +
      "From the home pages, guardians can see an overview of their loved one's upcoming visits, pending service requests, and helpful tips. " +
      "Key areas of the site include: Browse Services (to see available services and example volunteers), Request Service (to submit a new request), Schedule/My Schedule (to see upcoming visits), Notifications (to see updates and receipts), and pages describing services and how ElderEase works. " +
      "The ElderEase Assistant chatbot is available on Elder/Guardian pages as a floating button in the corner; when opened, it provides guidance about services, volunteers, pricing, and how to use different pages on the website.",
  },
  {
    id: "services-overview",
    tags: ["services", "what do you offer", "help", "support"],
    content:
      "ElderEase offers services for seniors and their guardians, including: Companionship, Home Visits, Running Errands, Light Housekeeping, and Socialization Activities. Companionship focuses on friendly support and conversation. Home Visits provide regular check-ins, medication reminders, and safety checks. Running Errands covers groceries, pharmacy pickups, and other daily tasks. Light Housekeeping helps keep the home tidy and comfortable. Socialization Activities include outings, community events, and staying connected with others.",
  },
  {
    id: "companionship-details",
    tags: ["companionship", "lonely", "conversation", "talk", "company"],
    content:
      "Companionship includes one-on-one meaningful conversations, emotional support and active listening, engaging activities and games, reading books or newspapers together, and watching movies or favorite shows. It is designed to combat loneliness and support mental wellness through regular social interaction.",
  },
  {
    id: "home-visits-details",
    tags: ["home visits", "visit", "check in", "check-ins", "welfare"],
    content:
      "Home Visits provide scheduled wellness check-ins, medication reminder assistance, basic safety assessment of the living space, coordination with family members, and following clear emergency contact protocols. This gives families peace of mind that their loved one is safe and cared for.",
  },
  {
    id: "errands-details",
    tags: ["errands", "shopping", "groceries", "pharmacy", "delivery"],
    content:
      "Running Errands includes grocery shopping and delivery, pharmacy pickups, post office visits, banking assistance, and pet supply shopping. It helps seniors maintain independence while getting support with tasks that may be physically challenging.",
  },
  {
    id: "housekeeping-details",
    tags: ["housekeeping", "cleaning", "laundry", "home", "tidy"],
    content:
      "Light Housekeeping includes tidying and organizing spaces, laundry and linen changes, dishwashing and kitchen cleanup, dusting and vacuuming, and trash removal. The goal is to maintain a clean and comfortable home without putting physical strain on the senior.",
  },
  {
    id: "socialization-details",
    tags: ["social", "socialization", "activities", "outings", "community"],
    content:
      "Socialization Activities include accompanied outings to parks, attendance at community events, group activities and clubs, cultural experiences like museums and concerts, and restaurant or café visits. These activities help seniors stay active and connected with their community.",
  },
  {
    id: "dynamic-pricing",
    tags: ["price", "pricing", "cost", "dynamic pricing", "rates"],
    content:
      "On ElderEase, pricing is shown transparently on the Browse Services and Request Service pages. Base hourly rates are set per service in Philippine pesos (PHP), for example: Companionship, Light Housekeeping, Running Errands, and Home Visits each have a clear per-hour rate. When a guardian submits a request, ElderEase calculates a receipt using: the selected services, the number of hours per service, a small 5% service fee, and a dynamic pricing adjustment that can increase the effective rate slightly when demand is high or when a volunteer has a very strong performance record. The final total, together with any dynamic pricing tier, is shown in the receipt that appears in Notifications.",
  },
  {
    id: "how-to-request-service",
    tags: ["request", "book", "schedule", "how to start", "service request"],
    content:
      "Guardians can request services through the Elder Request Service page. There, you provide client details (name, gender, age, address), choose one or more services such as Companionship, Light Housekeeping, Running Errands, or Home Visits, select a preferred date and start time, and add any notes. You can also optionally choose a preferred volunteer if available. After submitting, the request appears as Pending until a volunteer is assigned.",
  },
  {
    id: "upcoming-visits",
    tags: ["upcoming visit", "next visit", "schedule", "assigned volunteer"],
    content:
      "On the Elder home dashboard, there is a Next Support Visit card that shows your upcoming visit once a volunteer has been assigned. It lists the services, volunteer name and email, date, time range, and address. You can view more visit details, and pending service requests are also listed with their current status.",
  },
  {
    id: "pending-requests-and-cancel",
    tags: ["pending", "cancel", "reschedule", "change request"],
    content:
      "Pending service requests are shown under Pending Requests on the Elder home page. Each request displays services, date, time, and a Pending status. Guardians can cancel a pending request and optionally provide a reason, such as schedule change, price concerns, preferred volunteer unavailable, or other reasons.",
  },
  {
    id: "volunteers-and-ratings",
    tags: ["volunteer", "guardian", "highly rated", "ratings", "trusted"],
    content:
      "On the Browse Services page ElderEase shows background-checked, highly rated volunteers, together with their average ratings and number of completed sessions. " +
      "Guardians can compare volunteers directly on that page and may also pick a preferred volunteer when requesting a service. " +
      "The system checks availability and existing assignments to avoid scheduling conflicts.",
  },
  {
    id: "notifications-and-updates",
    tags: ["notifications", "updates", "receipt", "confirmation"],
    content:
      "After submitting a service request, guardians receive updates in the Notifications area when a volunteer is assigned or when there are changes. A receipt is provided once a visit is confirmed or completed, so you can track what happened and when.",
  },
];

function scoreEntry(message) {
  const text = message.toLowerCase();
  return (entry) => {
    let score = 0;
    for (const tag of entry.tags) {
      const t = tag.toLowerCase();
      if (text.includes(t)) score += 3;
      else if (t.length > 3 && text.split(/\W+/).includes(t)) score += 2;
    }
    // simple keyword overlap on main content
    const words = text.split(/\W+/).filter(Boolean);
    for (const w of words) {
      if (w.length < 4) continue;
      if (entry.content.toLowerCase().includes(w)) score += 0.3;
    }
    return score;
  };
}

// Out-of-scope keywords are intentionally not used for hard filtering anymore.
// The model is instructed in the system prompt to gently redirect questions
// that are truly unrelated to ElderEase back to the website topics.
const OUT_OF_SCOPE_PATTERNS = [];

app.post("/api/chat", async (req, res) => {
  try {
    const message = (req.body?.message || "").toString().trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const redirectReply =
      "I'm here to answer questions about ElderEase, our services, volunteers, and how to use this website. Could you ask something about our services or how to get support?";

    // Rank knowledge base entries against the question
    const scored = knowledgeBase
      .map((entry) => ({ entry, score: scoreEntry(message)(entry) }))
      .sort((a, b) => b.score - a.score);

    // Include more entries regardless of exact score so that OpenAI
    // almost always has some context to work with.
    const top = scored.slice(0, Math.min(scored.length, 8));

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Chatbot is not configured yet. Please try again later." });
    }

    const contextText = top
      .map((x, idx) => `Context ${idx + 1}:\n${x.entry.content}`)
      .join("\n\n");

    const systemPrompt =
      "You are ElderEase Assistant, a warm and empathetic helper for elderly users and guardians using the ElderEase website.\n\n" +
      "YOUR PRIMARY GOALS:\n" +
      "1) Answer dynamically and conversationally. Do not give rigid, pre-written FAQ answers. Always paraphrase and adapt website content naturally to the user's exact question and wording.\n" +
      "2) Use only the information provided from the ElderEase website context. Do NOT access or speculate about anything outside of ElderEase. Never use external knowledge such as news, general facts, or personal data. Never guess.\n" +
      "3) Treat all questions related to the ElderEase website as in-scope, including: services provided, volunteer information and ratings, how to use or navigate the site (for example: 'How do I use this site?' or 'Where do I request a service?'), and the general purpose and features of ElderEase.\n" +
      "4) Maintain context from previous messages in the conversation. Refer back naturally to what the user has already asked, so the chat feels continuous and coherent.\n" +
      "5) Ask gentle follow-up questions when useful, and suggest clear next steps. For example, you can say things like: 'Would you like to see the types of services we offer next?' or 'I can guide you to the Request Service page if you'd like.'\n" +
      "6) If a question is truly unrelated to ElderEase, politely respond with something like: 'I’m here to answer questions about ElderEase, our services, volunteers, and how to use this website. Could you ask something about that?'\n" +
      "7) Keep a warm, calm, and accessible tone that is easy for older adults and guardians to read. Use short paragraphs, simple language, and reassuring phrasing.\n\n" +
      "STRICT SAFETY RULES:\n" +
      "- Only answer using the website context provided in this conversation. If a detail (such as a specific volunteer's rating or visit count) is not present in that context or in previous valid turns, say you cannot see that information and suggest checking the appropriate ElderEase page instead.\n" +
      "- Never invent specific volunteer names, ratings, addresses, phone numbers, or visit counts.\n" +
      "- Keep every reply strictly about ElderEase, its services, volunteers, pricing, notifications, and how to use the site.\n\n" +
      "STYLE:\n" +
      "- Make every answer feel like a real conversation, not a static FAQ entry.\n" +
      "- It is fine if you repeat information, but always adapt it to the current question and the prior chat history.\n" +
      "- When appropriate, end with a gentle question or suggestion that helps the user with their next step on ElderEase.";

    const conversationMessages = [];
    for (const h of history) {
      if (!h || typeof h.message !== "string") continue;
      const role = h.type === "user" ? "user" : "assistant";
      conversationMessages.push({ role, content: h.message });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 400,
      temperature: 0.45,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        {
          role: "user",
          content:
            "Here is information from the ElderEase website:\n\n" +
            contextText +
            "\n\nThe user is now asking:\n" +
            message +
            "\n\nAnswer ONLY using the website information above. If something is missing, say you are not sure and gently redirect back to the site.",
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() || redirectReply;

    res.json({ reply });
  } catch (err) {
    console.error("[ElderEase chatbot] Error:", err);
    res.status(500).json({
      error: "Sorry, I'm having trouble answering right now. Please try again in a little while.",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`[ElderEase chatbot] Server listening on http://localhost:${port}`);
});

