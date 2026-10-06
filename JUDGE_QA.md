# Judge Q&A

### Why is this Agentic AI?
The orchestrator generates specialist plans from goals and current context. Specialists propose allowlisted tools, execute through backend policy, observe actual results, and hand off persistent evidence. Failures feed a new model planning invocation. The engine requires approval and independent verification before completion. Inspect Task plan revisions, AgentExecution, ToolExecution, Approval and WorkflowEvent rather than taking a narrative claim on faith.

### Why can't a normal chatbot do this?
A text response does not atomically allocate stock or commit purchases, bind a real approval, persist recovery state across process interruption, detect a stale quote, or verify changed order records. StockPilot combines model decisions with actual stateful execution. A fixed optimizer could solve a narrow static purchasing problem; the model adds goal interpretation, specialist decomposition, tool choice and adaptation to new observations. Backend arithmetic and policies are intentionally deterministic.

### Are your agents actually autonomous?
The production entry point selects a native Gemini or OpenAI adapter for plans, specialist action proposals and verification verdicts. They choose within explicit permissions; they do not have arbitrary authority. **Actual Gemini acceptance passed against Atlas**, including changed-quote replanning and final verification, in 3m 15.706s. Fixture tests remain labeled infrastructure evidence; they are separate from the real-provider run. Earlier OpenAI billing and Gemini integration failures are preserved in the review history.

### How does planning happen?
`AgentRunner.plan` sends trusted rules separately from the user goal, constraints, current business state, historical memory and failure observations. Native Gemini uses `responseJsonSchema`; optional OpenAI uses Responses structured outputs. Full Zod and semantic checks validate unique step IDs, required specialist delegation and verification/report ordering before the plan is stored.

### How does the system decide which agent acts?
The validated orchestrator plan assigns each sequential subtask a role. The engine persists the active step, invokes only that role's contract, and advances only after its tool result is stored. Sequential coordination is deliberate: inventory/purchase side effects need predictable ordering more than parallel-agent decoration.

### How are tools selected?
The current specialist returns a validated `{tool, arguments, rationale, memoryUsed}` request based on its objective, latest context and prior results. Each role receives its allowed tool set. The gateway independently rejects unknown tool names, forbidden roles, unrelated fields, invalid parameters and out-of-scope records. The model's rationale never grants permission.

### Can the workflow change after execution begins?
Yes. A stale quote, stock shortage, rejected proposal or failed verification creates observations and requests a new plan. Successful mutations remain in the ledger; the planner sees current allocations and purchases and must plan only remaining work. Prior plans remain visible in history.

### How does replanning work?
The recovery engine persists failure analysis, then invokes the orchestrator again with fresh business data, previous plans and failure evidence. It stores a new revision and specialist steps. The reproducible demo withdraws a quoted supplier's actual stock while approval is pending; the saved quote fails and the next plan selects an alternative. Live-model selection quality is verified by a real rehearsal, not by fixture tests.

### What happens if a tool fails?
ToolExecution stores the error and an audit event. Transient CAS conflicts retry the same idempotent action; business-condition failures feed replanning. Supplier quote failures create evidence-based memory. Two engine retries, four plan revisions and six recorded engine failures bound recovery before escalation.

### What happens if the AI produces invalid output?
Strict provider format is supplemented by local Zod validation. Invalid JSON/schema output is rejected and logged, then the invocation receives a correction and retries up to three attempts. Refusals, incomplete outputs, provider errors and missing configuration are explicit failures. No natural-language output controls a mutation.

### How do you prevent prompt injection?
User goals, supplier notes, memory and tool outputs are untrusted data in a separate message from trusted rules. More importantly, models have no arbitrary code, URL or query capability. Role schemas, tool permissions, authoritative scope/budget/deadline, approval hashes and execution-time business checks enforce the boundary even for malicious valid JSON proposals.

### How are high-risk actions handled?
Cumulative workflow purchasing above $250 creates a database Approval bound to exact validated tool input, action ID, revision and owner. The workflow pauses. Only an authenticated owner decision can resume it. Quote freshness is checked again after approval. Splitting transactions cannot bypass cumulative policy; rejected exact requests cannot be repeated in a new plan.

### Where is memory stored?
Short-term plans/outputs/observations are in Task. Indexed Memory records store verified outcomes and actual supplier failures, with source task/evidence. Supplier comparison applies a transparent ranking penalty from failure records and returns referenced memory IDs. A local test demonstrates the same subsequent comparison changing supplier rank because of prior evidence.

### How do you measure autonomy?
`services/analytics.js` derives metrics from actual records. Automation rate counts unique successful actions without HIGH-risk approval divided by all unique successful actions. Tool success uses finished attempts, workflow success excludes cancellations, and completion duration includes human waiting time. Empty denominators are null and displayed as “—”. Definitions are returned by the API and shown in the UI.

### What makes this different from an LLM wrapper?
Durable plans and subtasks, constrained specialist contracts, tool execution, atomic domain mutations, idempotent restart recovery, exact approval binding, changing-state replanning, independent verification and audit-derived metrics. AI text is never itself a business action.

### How do you secure API keys?
Backend environment only, ignored `.env` files, no frontend-key input or `VITE_` secret, no secret-bearing prompts/logs. Provider errors are sanitized. Production refuses missing credentials and short JWT secrets. Tests use placeholder transport credentials and clearly labeled test outputs.

### How does the database support the agentic architecture?
It stores workflow lifecycle/leases, shared memory, plans/revisions, all agent/tool attempts, exact approvals, decisions/observations, audit and actual inventory/purchase/order state. CAS plus mutation receipts connects execution evidence to reliable side effects. A unique partial index protects overlapping active order scopes; owner/task/time indexes support scoped queries.

### Are the tools real if this is a sandbox?
Yes: MongoDB stock, allocations, purchase commitments and notification/report records genuinely change. The business environment is explicitly sandboxed; no external supplier order, payment or email is claimed. External adapters are a future integration boundary and would need their own authorization/idempotency tests. A fake tool would merely print a result without a verified persisted effect; these do not.

### Can this scale?
The submitted MVP uses one API/worker service with expiring Mongo leases. It avoids unnecessary queues/microservices. For larger tenants, normalize the single-document domain ledger and receipt collection, use transactional or reservation-based domain writes, and move workers to a durable queue with monitoring. Current arrays and per-user metric scans are bounded-demo choices, not enterprise-scale claims.

### Is it submission-ready today?
The local implementation, Atlas persistence, real Gemini end-to-end acceptance, connected browser evidence, tests and documentation are verified. Public API/frontend deployment, production-origin/header verification and a recorded live video are still pending. Those are explicitly listed in the verification report; a local success is not advertised as public deployment.
