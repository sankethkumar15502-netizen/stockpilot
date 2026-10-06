# Product discovery

## Weighted evaluation
Ratings are design estimates (1–10), not measured performance. Columns: business importance (10), agentic necessity (15), reasoning (10), tools (10), coordination (10), autonomy (10), approvals (5), recovery (5), replanning (5), demo (10), feasibility (5), innovation (5). Weights total 100; score = sum(weight × rating) / 10.

| Problem | BI | AN | R | T | MA | A | H | F | RP | D | TF | I | /100 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Supply disruption recovery |10|10|10|10|9|9|10|10|10|10|8|7|95.5|
| Customer resolution operations |9|9|9|9|9|9|9|9|9|9|9|7|89.0|
| Procurement exceptions |10|9|10|10|9|9|10|9|9|9|9|7|92.5|
| Receivables disputes |10|9|9|9|8|8|10|8|9|8|8|8|87.0|
| Field-service recovery |9|9|10|9|9|9|8|10|10|9|7|8|90.0|
| IT incident remediation |10|10|9|10|9|9|10|10|10|9|5|6|91.5|
| Employee onboarding |8|7|8|9|8|9|8|8|7|8|10|6|80.0|
| Contract obligation operations |9|8|10|8|8|7|10|8|8|8|7|8|82.5|
| Marketing operations |8|8|8|9|8|8|8|7|8|8|8|7|80.0|
| Returns / replacements |9|9|9|10|8|9|9|9|9|9|9|7|89.0|

The initial shortlist's rounded estimates are superseded by the explicit calculation above. Fixed onboarding, text-only marketing, and extraction-only contract tools were rejected as insufficiently agentic. Supply recovery wins because decisions require fresh inventory, quotes, deadlines, budgets, policy, historical reliability, and verified mutations.

## StockPilot
**Users:** SME operations managers, inventory coordinators, purchasing approvers.
**Problem:** urgent orders require coordination across inventory, procurement, suppliers, and customer communications. A quote may become invalid while a manager is approving it.
**Differentiation:** auditable goal-to-mutation execution, version-bound approval, tenant-scoped tools, independent fulfillment checks, and memory grounded in verified supplier failures.

## Business workflow and autonomy
1. User states goal and explicitly supplies authoritative order scope, budget, and deadline.
2. Orchestrator reads tenant data and historical outcomes, dynamically creates specialist steps.
3. Research retrieves inventory, suppliers, orders, and memory through an allowlisted tool.
4. Analysis compares supplier availability, cost, and lead times using actual arithmetic.
5. Execution reserves stock and proposes purchases, constrained by backend policy.
6. Purchases over $250 require a persisted exact-action approval; smaller purchases execute within budget.
7. Approval resumes the saved request. A changed supplier version causes a genuine tool error.
8. The engine records failure, retries transient errors, asks the orchestrator for a revised plan, and continues with current context.
9. Verification checks actual order allocations, spend, and expected arrival. Completion requires a passing deterministic check and an independent structured verdict.
10. Communication publishes a persisted report / in-app notification. Outcome memory affects later supplier comparison.

**Agents:** orchestrator (plan revisions), research (context), analysis (quotes), execution (mutations), verification (checks), communication (report). These are scoped model invocations with explicit contracts, not six concurrent servers.
**Tools:** inspect_business, compare_supply, reserve_inventory, place_purchase, allocate_purchase, verify_fulfillment, notify_operations, publish_report.
**Failure cases:** invalid AI JSON, provider timeout, invalid parameters, outdated supplier version, unavailable stock, rejection, incomplete verification, bounded recovery exhaustion, process restart.
**Demo:** allocate 8 on-hand units against 30 ordered; approve a 22-unit $660 purchase. Before approval, withdraw supplier A's stock through the demo control. Saved quote fails, live replanning selects supplier B, a new exact purchase needs approval, allocations verify, report publishes.

## Initial architecture and roadmap
React + MUI + Router → Express REST/JWT → leased Mongo-backed worker → native Gemini structured outputs (optional OpenAI Responses) → schema + permission + approval gateway → CAS-protected business state → verification and memory. Poll persisted records every two seconds; no synthetic progress. One backend instance is the hackathon deployment target. The initial discovery preceded credential setup; subsequent actual Gemini/Atlas acceptance is documented in `LIVE_ACCEPTANCE.md`.

Entities: User, Task (embedded subtasks/plan revisions), AgentExecution, ToolExecution, Approval, WorkflowEvent (also audit), BusinessState (inventory/suppliers/orders/purchases/notifications/idempotency ledger), Memory. API groups: auth, tasks, approvals, analytics/audit, business/demo, health/contracts. Pages: landing/auth, dashboard, creation, live/detail, approval center, analytics, audit, business context.

Roadmap: architecture → models/auth → AI contracts/tools → persistent engine → approvals → connected UI → integration/security/browser checks → deployment configuration/documentation → adversarial review. No secrets or hosted deployment accounts are present initially; live provider and production verification require those credentials.
