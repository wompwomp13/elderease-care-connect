# ElderEase — Project Handoff

Written for a developer or AI agent picking this project up cold. Verified against `main` at commit `2b9d842`.

For a code-level walkthrough with snippets of the main flows, see `docs/Project-Rundown.md`.

---

## 1. What the product is

**ElderEase** is a care-coordination platform where **guardians** book support services for an elderly family member, **volunteers** ("companions") accept and perform the visits, and an **admin** triages volunteer applications, assigns volunteers to requests, and monitors analytics.

It is a capstone/school project. Currency is Philippine pesos (PHP), and phone validation assumes Philippine mobile numbers.

Bookable services and their base hourly rates:

| Service | Base rate (PHP/hr) |
| --- | --- |
| Companionship | 150 |
| Light Housekeeping | 170 |
| Running Errands | 200 |
| Home Visits | 180 |

"Socialization Activities" appears in marketing copy (`ServicesInfo`, chatbot knowledge base) but is **not** bookable in the request form.

---

## 2. User types

| Role | Firestore `role` | Route prefix | How the account is created |
| --- | --- | --- | --- |
| Guardian / Elder | `elderly` | `/elder` | Public signup at `/signup` |
| Volunteer / Companion | `companion` | `/companion` | Apply on the landing page → admin approves → sign up at `/signup/volunteer` (email must match an **approved** application) |
| Admin | `admin` | `/admin` | **Hardcoded**: the email `admin@gmail.com` is granted admin in both `src/lib/auth.ts` and `firebase.rules`. Cannot be created through signup. |

Authentication is Firebase Auth (email/password). A compact profile is mirrored to `localStorage` under the key `elderease_auth_profile`. `subscribeToAuth` keeps a live `onSnapshot` on `users/{uid}`, so admin edits (name changes, termination) propagate to open sessions immediately.

Terminated volunteers **can still log in**; `CompanionGate` shows them a restricted "account terminated" screen with the reason instead of the app.

---

## 3. Tech stack

- **Frontend:** React 18, TypeScript, Vite 5, React Router 6, TailwindCSS + shadcn/ui (Radix), framer-motion, recharts, lucide-react
- **Backend:** Express 4 — a single file, `server/chatbot.js`, which serves both the chatbot API and the built frontend
- **AI:** OpenAI `gpt-4.1-mini` via the official `openai` SDK
- **Data:** Firebase Firestore, Firebase Auth, Firebase Storage (project `elderease-e2ebf`)
- **PDF export:** jsPDF + jspdf-autotable, entirely client-side
- **Hosting:** Render, one Web Service

---

## 4. Repo layout

```
server/chatbot.js          Express API + static host + OpenAI + knowledge-base fallback
src/App.tsx                All route definitions
src/lib/                   auth, firebase, pricing helpers, forecasting, reports, time, leave
src/hooks/                 use-chat-volunteers, use-toast, use-mobile
src/pages/elder/           Guardian pages
src/pages/companion/       Volunteer pages
src/pages/admin/           Admin pages
src/components/sections/   Landing page sections
src/components/ui/         shadcn primitives (~50 files, largely untouched)
firebase.rules             Firestore security rules (NOT named firestore.rules)
storage.rules              Firebase Storage rules
firestore.indexes.json     Composite index for volunteerLeave
docs/Project-Rundown.md    Code-level architecture walkthrough with snippets
```

---

## 5. Routing map

Defined in `src/App.tsx`.

- **Public:** `/`, `/login`, `/signup`, `/signup/volunteer`
- **`/elder`** → `ElderLayout` → index, `notifications`, `schedule`, `request-service`, `services-info`, `browse-services`, `payment-confirmation`, `profile`
- **`/companion`** → `CompanionGate` → index, `assignments`, `requests`, `activity`, `time-off`, `profile`
- **`/admin`** → `AdminGate` → index (Dashboard), `applications`, `volunteers`, `requests`
- `/home` redirects to the current role's home; `*` → NotFound

### Route guards

- **`AdminGate`** requires `role === "admin"`, and force-logs-out if the gate is remounted via a browser history POP after the admin left the section.
- **`CompanionGate`** only checks that the user is signed in and not terminated. It does **not** check `role === "companion"`, so any authenticated user can currently reach `/companion/*`.

---

## 6. Firestore data model

Seven collections are actually used. (`volunteers` and `formMetrics` appear in `firebase.rules` but no app code touches them.)

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `users` | Auth profile | `role`, `email`, `displayName`, `phone`, `status`, `terminationReason` |
| `pendingVolunteers` | **Volunteer source of truth** — both applications and the approved roster | `fullName`, `email`, `services[]`, `status` (`pending`/`approved`/`rejected`/`terminated`), `idFileUrl`, `profilePhotoUrl`, `terminationReason` |
| `serviceRequests` | Guardian bookings | `userId`, `services[]`, `perServiceHoursByName`, `serviceDateTS` (midnight ms), `startTime24`/`endTime24`, `preferredVolunteerEmail`, `status` (`pending`/`assigned`/`cancelled`), decline arrays, cancellation fields |
| `assignments` | Scheduled visit + **receipt** | `requestId`, `volunteerEmail`, `elderUserId`, `receipt{}`, `status` (`assigned`/`completed`/`declined`/`cancelled`), `acceptedByVolunteer`, `awaitingGuardianConfirm`, `guardianConfirmed` |
| `ratings` | Post-visit ratings | `assignmentId`, `volunteerEmail`, `rating` (1–5), `feedback` |
| `volunteerLeave` | Full-day time off | `volunteerEmail`, `startDayMs`, `endDayMs`, `reason` |
| `notifications` | In-app alerts | `recipientUid`, `type` (`service_request_pending` / `volunteer_declined`), `read` |

There is **no separate `volunteers` collection in practice** — an approved volunteer is a `pendingVolunteers` document with `status: "approved"`. This surprises most newcomers.

**Firebase Storage:** `volunteer-ids/` holds uploaded application IDs (public read/write per `storage.rules`); `profile-photos/{uid}/` holds volunteer avatars (authenticated read, owner write).

---

## 7. Core flows

### Service request lifecycle

Two linked documents: `serviceRequests` is the booking, `assignments` is the scheduled visit and carries the receipt.

```
Guardian submits            → serviceRequests.status = "pending", pending notification created
Admin assigns               → request "assigned" + assignments doc "assigned" (acceptedByVolunteer unset)
  OR volunteer self-accepts → same, with acceptedByVolunteer: true
Volunteer declines an admin offer → assignment "declined", request reverts to "pending"
Volunteer marks complete    → assignment "completed", awaitingGuardianConfirm: true
Guardian confirms + rates   → guardianConfirmed: true, ratings doc created
Guardian cancels (pending only) → request "cancelled"
```

Two things to internalise:

- There is **no `confirmed` status string**. "Confirmed" in the guardian UI means `assignments.status === "assigned"`.
- Analytics count a service as complete only when `status === "completed" && guardianConfirmed === true`. A volunteer marking a visit done is not enough.

### Pricing

Authoritative rate table lives in `src/lib/assignmentHelpers.ts`. The receipt is computed **at assignment time** and stored on `assignments.receipt`.

```
adjustedRate = baseRate × (1 + performancePercent + demandPercent)
subtotal     = Σ (adjustedRate × hours)
commission   = subtotal × 0.05
total        = subtotal + commission
```

Performance tier, from the volunteer's completed tasks and average rating:

| Tier | Criteria | Adjustment |
| --- | --- | --- |
| Associate | default | 0% |
| Proficient | ≥5 tasks and rating ≥4.2 | +5% |
| Advanced | ≥20 tasks and rating ≥4.4 | +8% |
| Expert | ≥40 tasks and rating ≥4.6 | +12% |

Demand tier applies to **admin assignment only** (volunteer self-accept uses 0% demand). It is the ratio of competing requests to available matching volunteers in the same window: Normal 0%, High +3% (≥1.0), Peak +6% (≥1.5), Surge +10% (≥2.0).

### Scheduling conflicts

Availability is minute-interval overlap against the volunteer's same-day assignments, plus any `volunteerLeave` day range. Enforced in three places: the guardian request form, admin assignment, and volunteer accept. Leave blocks new work but does not auto-cancel already-accepted visits. Maximum leave span is 60 days.

### Volunteer lifecycle

```
Public application → pendingVolunteers (status: pending)
Admin approves/rejects → status: approved | rejected
Approved email unlocks signup at /signup/volunteer → users doc with role: companion
Admin terminates (reason required) → status: terminated, synced into users by email
Admin reactivates → status: approved, reason moved to previousTerminationReason
```

---

## 8. The chatbot

There are **two separate, unrelated chatbots**. This is the most common source of confusion.

1. **`src/components/sections/FAQChatbotSection.tsx`** — on the public landing page. Purely local: the user types a number 1–10 and gets a canned answer. No AI, no network calls. Its content is stale (USD prices, US phone numbers, fictional US service areas).

2. **`src/components/elder/ElderChatbot.tsx`** — the real assistant. A floating button mounted in `ElderLayout`, so it persists across guardian pages.
   - Volunteer questions ("top volunteers", a volunteer by name) and pricing questions are answered **locally** from live Firestore data via `useChatVolunteers`, specifically to avoid hallucinated names and ratings.
   - Everything else is POSTed to `/api/chat` on the same origin, along with conversation history.
   - `server/chatbot.js` scores its ~13-entry knowledge base against the question, injects the top 8 entries as context, and calls `gpt-4.1-mini` with a strict "use only this context" system prompt. Replies are post-processed to convert page mentions into `[label](/elder/...)` links rendered as React Router `Link`s.
   - **Resilience:** the OpenAI client retries twice with a 12s timeout; if it still fails (or no API key is set), the server returns a knowledge-base answer at HTTP 200 rather than an error. The client aborts after 30s.

---

## 9. Analytics, forecasting, and reports

`src/lib/forecast.ts` buckets data by month, then runs linear regression (`trend`) to project forward. It requires at least two non-zero months, and produces confidence bands of ±residual standard deviation × √step plus a green/yellow/red confidence badge based on the coefficient of variation. A flat-mean `average` method used to be selectable in the forecast sidebar; it was removed because it repeated a typical month rather than projecting, which could not be defended.

The current month appears on both lines. `buildForecastSeries` also returns `currentPrediction` (plus `currentLow`/`currentHigh`), a back-test fitted on the months *before* the current one and projected one step forward. Charts write it onto the last historical row, so the actual and forecast lines meet at the current month instead of leaving a gap, and the forecast horizon still counts only future months. It is `null` when fewer than two non-zero months precede the current one, in which case that chart falls back to the old gapped behaviour.

The admin Dashboard has four tabs — Overview, Request Analytics, Volunteer Analytics, Operations — covering fulfillment rate, per-service demand forecasts, capacity-versus-demand gap, volunteer contribution and growth, accept/decline rates, and cancellation reasons.

All three roles can export a date-ranged PDF (`src/lib/report-utils.ts`, jsPDF, client-side only) through `ReportDateRangeDialog`.

---

## 10. Theming

`src/components/ThemeFromRoute.tsx` sets a `data-theme` attribute on `<html>` based on the route prefix:

| Route | `data-theme` | Palette |
| --- | --- | --- |
| `/admin/*` | `admin` | Blue / teal |
| `/elder/*` | `guardian` | Sage green |
| `/companion/*` | `volunteer` | Warm amber |

Palettes are CSS custom properties in `src/index.css` (around lines 70–112). Tailwind only maps semantic tokens (`primary`, `sidebar`, …) onto those variables, so there is no role-specific Tailwind config.

---

## 11. Hosting and deployment

The frontend and backend deploy together as **one Render Web Service**. The Express server serves the built `dist/` with an SPA fallback, so the site and `/api/chat` share an origin. That is why no API URL needs configuring in production.

| Setting | Value |
| --- | --- |
| Service | `elderease-care-connect` (Render Web Service, Node, Oregon, Free tier) |
| Repo / branch | `wompwomp13/elderease-care-connect`, `main`, auto-deploy on push |
| Build command | `npm install && npm run build` |
| Start command | `node server/chatbot.js` |
| Environment variable | `OPENAI_API_KEY` (only one required; Render supplies `PORT`) |
| Live URL | https://elderease-care-connect.onrender.com |

A healthy deploy logs `Serving frontend from /opt/render/project/src/dist` followed by `Server listening on ...`. If it instead logs `No production build found`, the build step did not run.

**Free-tier cold starts:** the service sleeps after roughly 15 minutes of inactivity. The first request afterwards can take 30–60 seconds or fail once before succeeding. This is the single most common false bug report on this project — it is not a code defect. Warm the site up before a demo, or move to a paid instance.

Firebase is a separate managed service. `firebase.rules` and `storage.rules` must be deployed through the Firebase console or CLI; Render does not touch them.

---

## 12. Local development

```bash
npm install
npm run dev:with-chatbot    # Vite on :8080 + Express on :4000, with /api proxied
```

`npm run dev` alone runs the frontend only, and the chatbot will fail to connect. The Vite dev proxy (`vite.config.ts`) forwards `/api` to `localhost:4000`.

There is **no `.env` file in the repo**. `OPENAI_API_KEY` currently comes from a Windows system environment variable on the owner's machine. A new developer should create a `.env` in the repo root:

```
OPENAI_API_KEY=sk-...
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run chatbot:server`.

---

## 13. Known issues, gotchas, and tech debt

**Security and correctness**

- Firestore rules are broadly permissive: any signed-in user can read all of `serviceRequests`, `assignments`, `ratings`, `notifications`, and `pendingVolunteers`, and can update any `serviceRequests` document. Acceptable for a demo, not for real PII.
- `CompanionGate` does not verify the user's role, so any signed-in user can open `/companion/*`.
- Admin identity is a hardcoded email string in two places (`src/lib/auth.ts` and `firebase.rules`). Changing it means editing both.
- The Firebase web config, including the API key, is hardcoded in `src/lib/firebase.ts`. This is normal for Firebase web clients since rules are the real boundary, but it is committed to git.
- `storage.rules` allows public read **and write** on `volunteer-ids/`.

**Duplication and drift**

- Service rates exist in three places: `src/lib/assignmentHelpers.ts` (authoritative), `src/pages/elder/PaymentConfirmation.tsx`, and the local pricing reply inside `src/components/elder/ElderChatbot.tsx`. Change one, change all three.
- The chatbot knowledge base in `server/chatbot.js` restates site content and can drift from the actual pages.

**Dead or mock code**

- `src/pages/elder/BrowseServices.tsx` is mock cards with USD prices, not wired to Firestore.
- `src/pages/elder/PaymentConfirmation.tsx` is unreachable from the current flow; it renders from `location.state`.
- The landing-page FAQ bot has stale content (USD, US phone numbers, US cities).
- The `volunteers` and `formMetrics` collections are unused.
- `editingLeaveRows` in `src/pages/admin/VolunteerList.tsx` is never populated.
- "Mark as read" in guardian Notifications is UI-only and never writes to Firestore.

**Build and tooling**

- The production bundle is a single ~2.4 MB chunk, and several team/hero PNGs are multiple megabytes uncompressed. First load on a cold free-tier instance is slow.
- No tests and no CI.
- `npm install` reports roughly 31 audit vulnerabilities.
- `README.md` is a placeholder containing only `# buh`.

---

## 14. Suggested first tasks

1. Replace the placeholder `README.md` with real setup instructions.
2. Add a genuine role check to `CompanionGate`.
3. Tighten the Firestore and Storage rules (scope reads to the owning user; lock down `volunteer-ids/`).
4. Consolidate the three copies of the service rate table into `assignmentHelpers.ts`.
5. Refresh or remove the stale landing-page FAQ chatbot.
6. Add route-level code splitting and compress the large PNGs.
