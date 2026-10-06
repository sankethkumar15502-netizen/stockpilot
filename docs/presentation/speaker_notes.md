# StockPilot — hackathon speaker notes

Present slides 1–12 in approximately 4m 25s. Slides 13–15 are optional backup for questions. Speaker notes are also embedded in the PowerPoint.

## One-sentence pitch
StockPilot uses policy-constrained AI agents to recover urgent orders, execute approved sandbox business actions and verify the result.

## Before presenting
- Add your name/team/event to the title slide if desired.
- Open http://localhost:5173 and verify the API health reports Gemini.
- Use a fresh account for a new full workflow, with the seed sensor orders, $1,500 budget and four-day deadline.
- Follow ../../DEMO_SCRIPT.md for a human-clicked demo; do not expose credentials or private exports.
- The recorded CLI acceptance used explicit sandbox consent for two approval decisions. Distinguish it from a live human-clicked walkthrough.

## 1. stockpilot. — 20s

Opening: StockPilot is an agentic supply recovery workspace for small and medium businesses. When inventory runs short or supplier availability changes, it turns an operations goal into a plan, approved business actions and a verified result. The key promise is recovery with evidence, rather than another chat answer.

## 2. Urgent orders turn into a coordination problem. — 25s

Explain the business problem using the demo inputs: two urgent orders need thirty sensor units, but inventory has only eight. The manager needs to compare suppliers, respect the deadline and budget, obtain approval and avoid buying against a stale quote. These are coordinated business decisions, not simply a question-answering task. Do not invent time savings or market-size statistics.

## 3. One goal in. A verified recovery plan out. — 25s

Describe the input: a natural-language goal plus explicit order scope, maximum budget and deadline. Gemini interprets the goal and plans specialist work. The backend keeps those constraints authoritative. The output is an executed and verified allocation plan with evidence. In this MVP, purchasing changes an internal sandbox ledger; it does not place an external supplier order or send a payment.

## 4. Six roles. One coordinated workflow. — 20s

These are six scoped agent roles coordinated by one durable engine, not six separate servers. The orchestrator plans; research reads; analysis compares; execution proposes domain mutations; verification checks evidence; communication publishes the report. Every role has an explicit structured contract and limited tools. The handoffs are sequential so business mutations remain consistent and auditable.

## 5. From goal to action — with a recovery loop. — 25s

Walk through the loop. The user sets the goal and constraints. The orchestrator produces a plan, specialists execute real tools, and a high-risk purchase pauses for approval. In the recovery demo, stock changes before approval. Quote-version checks reject the stale request. That observation and supplier-failure memory drive a new plan. The system preserves existing reservations, buys only the remaining shortfall, verifies the result and publishes evidence. A supplier change is a demonstrated recovery branch, not mandatory in every workflow.

## 6. AI reasoning meets a durable execution engine. — 20s

The frontend reads real persisted state through authenticated REST endpoints. One Express process runs the API and a leased workflow worker. Gemini produces structured plans and actions, validated by full Zod schemas and tool contracts. The policy gateway enforces permissions and business rules before tools mutate Atlas. Task state, approvals, executions, audit and memory are persistent. Optional native OpenAI support exists, but the verified run uses Gemini 3.5 Flash Lite. There is no runtime fixture fallback.

## 7. AI proposes. The backend enforces. — 20s

The model cannot grant itself permission. Every action crosses a backend boundary: permitted role, strict input schema, owned scope and current workflow state. Cumulative purchases above two hundred fifty dollars require approval, preventing split-purchase bypass. The saved approval binds the exact validated request. Execution still rechecks fresh quotes, budget, remaining demand and deadline. Atomic ledger updates and replay receipts prevent duplicate effects after interruptions. Keys remain on the backend.

## 8. The demo: recover when the supplier changes. — 30s

This is the strongest demo moment. After reserving eight units, supplier A initially appears feasible at six hundred sixty dollars. While the purchase waits for approval, the acceptance script withdraws its real sandbox stock. The stale approved request fails quote-version validation. The model replans using current data and memory, then proposes twenty-two units from supplier B for seven hundred ninety-two dollars. A second exact approval allows purchase commitment and allocations. Supplier C is cheaper but its nine-day lead time misses the four-day deadline. CLI approvals used explicit --approve-sandbox consent; do not present those as human clicks in a recorded walkthrough.

## 9. Measured execution. A verified outcome. — 25s

The real Gemini and Atlas workflow completed in exactly 195,706 milliseconds: three minutes and 15.706 seconds. All thirty requested units were allocated, and the commitment was seven hundred ninety-two dollars within the fifteen-hundred-dollar budget. Two accepted plan revisions and two persisted approval decisions are in the evidence. Analytics report ninety percent automation and ninety point nine percent tool success for this isolated account: ten successful tool attempts and one genuine induced stale-quote failure. These are single-run measurements, not generalized performance claims. Thirty-seven backend tests and two fixture-backed desktop/mobile browser tests also passed. Completion is scheduled/allocated fulfillment, not delivery.

## 10. Every decision leaves visible evidence. — 25s

This image comes from the normal React application reading the actual completed live task from Atlas, not a mockup or fixture screenshot. Show the completed status and plan version two, then explain the tool and agent tabs, approval center, history and execution trail. The product also includes business context, analytics, audit and JSON evidence export. During a live demo, open localhost port 5173 and use a fresh account so earlier allocations do not remove the deficit.

## 11. Less coordination. More accountability. — 20s

The intended value is less fragmented coordination and clearer accountability. Operations gets a shared live workflow, purchasing gets exact-action control, and audit gets evidence connecting decisions to mutations and checks. These are product benefits, not measured ROI claims. The current verified scope is a local frontend/API connected to hosted Atlas and real Gemini, executing a sandbox ledger. Next come public Render/Vercel deployment, production configuration checks and a recorded human-clicked demo. Then supplier/ERP and notification adapters, multi-SKU planning, organizational roles and high-volume scaling.

## 12. stockpilot. — 10s

Close: StockPilot turns goals into accountable business actions. It plans, delegates, obtains approval, adapts when a supplier changes and proves the final result. Invite the judges to inspect the live workflow, actual model/tool records and exported evidence. Transition to the application demo or questions; backup slides follow.

## 13. Backup: actual Gemini invocation records. — backup

Use this slide if judges ask whether the agents are real. These are actual native Gemini invocation records displayed by the connected app. They include role, provider/model, plan revision and attempts. Failed semantic proposals can be corrected before any tool runs; their invocation records remain visible. The runtime provider factory selects native Gemini or optional native OpenAI from trusted configuration. Fixtures are loaded only by tests and visibly labeled TEST_FIXTURE_NOT_AI. Full evidence is retained in Atlas and privately exported.

## 14. Backup: eight tools and persistent proof. — backup

The eight tools are actual backend functions with input/output schemas, roles and risk. Inspect business reads scoped records; compare supply calculates feasibility and memory-adjusted ranking; reserve inventory allocates on-hand stock; place purchase commits sandbox incoming supply; allocate purchase allocates it to orders; verify fulfillment reads actual ledger checks; notify operations persists in-app notifications; publish report persists an evidence-grounded report. MongoDB records users, tasks, agent/tool executions, approvals, events, domain state and memory. Quote versions, atomic CAS and receipts enforce concurrency and replay safety.

## 15. Backup: answers to the hard questions. — backup

Additional answers: planning is model-generated, not a hardcoded workflow template. Tools are allowlisted and cannot execute arbitrary code, network requests or database queries. A changed supplier quote fails even after approval because approval does not override fresh business invariants. Restart recovery uses leases, persisted state and idempotent receipts. Supplier-failure memory influences later rankings but never changes permissions. The workflow owner currently approves actions; separate organizational roles are future work. One measured successful scenario does not establish universal model reliability.

## Evidence sources
- ../LIVE_ACCEPTANCE.md
- ../VERIFICATION.md
- ../../README.md
- ../../ARCHITECTURE.md
- ../../SECURITY.md
- ../../JUDGE_QA.md
- ../screenshots/README.md
