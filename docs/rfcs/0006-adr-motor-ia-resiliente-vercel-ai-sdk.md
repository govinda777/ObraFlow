# ADR-0006: Resilient AI Engine with Vercel AI SDK and Google Gemini Infrastructure

| Metadata | Value |
| :--- | :--- |
| **Status** | 🟢 `Accepted` |
| **Date** | 2026-11-15 |
| **Authors** | ObraFlow Architecture Team |
| **Context** | Resilient AI processing for budget diagnostics, plan extraction (EAP), and room simulation |
| **Reference Model** | [`gemini-chatbot`](https://github.com/govinda777/gemini-chatbot) pattern |
| **Related Decisions** | [ADR-0004](./0004-adr-migracao-neon-db-infra-vercel.md), [ADR-0005](./0005-adr-autorizacao-por-jwt-neon-e-auditoria-de-eventos.md) |

---

## 1. Context and Problem Statement

In ObraFlow, AI performs mission-critical engineering workflows:
1. **Architectural Plan & Specifications Extraction:** Converting multi-page PDFs and engineering blueprints into a Work Breakdown Structure (WBS/EAP), listing epics, tasks, estimated man-hours, and material requirements.
2. **Room Simulation (Before vs. After Studio):** Analyzing on-site finishes, stone masonry, lighting, and generating structured design recommendations.

The prototype relied on direct client-side calls to Google Gemini via localStorage keys. In production, this causes:
- **Security Vulnerabilities:** Leaking API credentials to the browser.
- **Fragile Parsing:** Regex parsing of unstructured LLM markdown responses.
- **Failures on Cold Starts & Missing Keys:** Static imports that break Next.js server builds when keys are absent during build time.
- **Lack of Observability:** No audit trail of token consumption, cost, or circuit breaking under rate limits.

---

## 2. Architectural Decision

We adopt the resilient AI infrastructure model proven in the reference project [`gemini-chatbot`](https://github.com/govinda777/gemini-chatbot), powered by the **Vercel AI SDK (`ai`)** and **Google Generative AI (`@ai-sdk/google`)**.

### 2.1. Structural Pillars

1. **English Directory Standard (`src/lib/ai/`):**
   ```
   src/lib/ai/
   ├── index.ts                # Lazy dynamic proxy with wrapLanguageModel
   ├── custom-middleware.ts    # Telemetry, audit trail, circuit-breaker hooks
   ├── schemas/                # Strict runtime typing via Zod schemas
   │   ├── eap.schema.ts       # Work Breakdown Structure (Epics, Tasks, Materials)
   │   └── budget.schema.ts    # Unit cost and SINAPI alignment schema
   └── actions/                # Server Actions invoked exclusively on Vercel backend
       ├── extract-eap.ts      # Structured plan diagnostic action
       └── simulate-room.ts    # Room aesthetic and material simulation
   ```

2. **Lazy Initialization via Dynamic Proxy:**
   Prevent server compilation failures during static generation (`next build`) by initializing the Google Generative AI client only upon first invocation:
   ```typescript
   export const geminiFlashModel = new Proxy({} as any, {
     get(target, prop) {
       if (!wrappedModel) {
         wrappedModel = wrapLanguageModel({
           model: google(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
           middleware: customMiddleware,
         });
       }
       return typeof wrappedModel[prop] === "function"
         ? wrappedModel[prop].bind(wrappedModel)
         : wrappedModel[prop];
     }
   });
   ```

3. **Guaranteed Structured Outputs via `generateObject`:**
   All AI responses must be strictly validated against Zod schemas, returning strongly typed TypeScript objects instead of raw markdown text.

4. **Middleware-Enforced Governance & Audit:**
   Integrates directly with the `audit_events` ledger established in ADR-0005, logging tenant ID, model version, execution latency, and token consumption.

---

## 3. Infrastructure as Code (OpenTofu / Vercel)

The infrastructure layer must provide the required configuration parameters to the Vercel project declaratively:

- `GEMINI_MODEL`: Defaulting to `gemini-2.5-flash` for high throughput and sub-second diagnostics.
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY`: Injected into Vercel Serverless Function runtime environments (`development`, `preview`, `production`) with `sensitive = true` protection.

---

## 4. Consequences and Benefits

- **Zero Client Exposure:** All Gemini calls are executed server-side in Serverless Functions close to the Neon database (`iad1`).
- **Resilience:** Automatic fallback between API key variable names (`GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`).
- **Clean Type Safety:** End-to-end integration with Next.js Server Actions and TypeScript.
