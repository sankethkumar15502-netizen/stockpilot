# StockPilot submission brief

## 1. Project name
StockPilot.

## 2. One-line description
An agentic supply recovery platform that turns business goals into approved, executed and verified fulfillment plans.

## 3. Problem statement
SME operations teams coordinate urgent orders, insufficient inventory, changing supplier quotes, budgets and approvals manually. Fragmented decisions produce delays and stale purchasing attempts. Ten candidate problems were scored; the explicit discovery matrix selects supply recovery at 95.5/100.

## 4. Solution
Submit a goal and authoritative scope/budget/deadline. A durable engine coordinates specialist agents, invokes validated real domain tools, pauses for approval, reacts to changes, verifies ledger state and publishes evidence.

## 5. Why Agentic AI
The goal is an operational outcome rather than an answer. The plan, delegated steps and chosen tools change from observations. Backend rules enforce arithmetic/authority; AI interprets goals, decomposes work and adapts plans. Actual Gemini acceptance demonstrated planning, stale-quote recovery and verified completion; fixtures are separate infrastructure evidence.

## 6. Agent architecture
Orchestrator, research, analysis, execution, verification and communication. Explicit purpose/input/output/tool/authority/failure/handoff/schema contracts: `backend/src/agents/contracts.js`. Sequential durable coordination: `backend/src/workflows/engine.js`.

## 7. Tool architecture
Eight allowlisted tools: inspect_business, compare_supply, reserve_inventory, place_purchase, allocate_purchase, verify_fulfillment, notify_operations, publish_report. `tools/gateway.js` enforces role, schema, scope, policy and approval before invoking actual Mongo-backed tools. No arbitrary code, URLs or queries.

## 8. Workflow lifecycle
Created → planning → persisted plan → execution/tool wait → approval where needed → verification → published report → fresh invariant check → completed. Failures invoke analysis, bounded retries/replans or escalation. Cancellation preserves committed effects; leases and receipts enable recovery.

## 9. Database schema
User; Task with subtasks/revisions/shared state; AgentExecution; ToolExecution; Approval; WorkflowEvent/audit; BusinessState with atomic related business ledger/notifications/receipts; Memory. Owner/time/task indexes and unique active order scopes. [Architecture](ARCHITECTURE.md).

## 10. API list
Auth register/login/me/logout; tasks create/list/detail/start/cancel/plan/agents/events; approvals list/detail/approve/reject; analytics; audit; business read/initialize/import/disruption; contracts; health. [Exact routes, payloads and errors](docs/API.md).

## 11. Folder structure
`backend/src/{agents,ai,config,middleware,models,routes,services,tools,validators,workflows,utils}`; `frontend/src/{components,pages,layouts,hooks,context,services,utils}`; integration/browser tests; docs; Render/Vercel/CI configuration. [Full tree](README.md#9-stack-and-folder-structure).

## 12. Security architecture
Revocable JWT sessions, bcrypt cost 12/byte validation, owned queries/tool scope, strict Zod schemas, allowlisted actions, preflight/CAS business checks, cumulative purchase approval, exact input binding, quote versioning, rejected replay denial, backend-only secrets, prompt trust boundaries, rate limits, CORS, escaped UI and frontend CSP. [SECURITY.md](SECURITY.md).

## 13. Testing results
Latest local verification: 37 backend/SDK/state tests passed; 2 desktop/mobile browser tests passed; build/syntax checks passed; recorded dependency audit has zero vulnerabilities. Infrastructure tests use explicitly labeled providers and actual MongoDB. Native Gemini `gemini-3.5-flash-lite` completed an actual Atlas-backed acceptance in **3m 15.706s**: two accepted plans, sandbox approvals, changed-quote failure, alternate purchasing, full allocations, independent verification and a final report. [Provenance and results](docs/VERIFICATION.md); [measured live evidence](docs/LIVE_ACCEPTANCE.md).

## 14. Deployment URLs
Local frontend `http://localhost:5173`; local API `http://localhost:4000/api/health` returned HTTP 200 and now uses verified MongoDB Atlas. **Hosted frontend/backend deployment is pending platform credentials; no public web URL is claimed.** [Prepared deployment](docs/DEPLOYMENT.md).

## 15. GitHub repository structure
Monorepo with locked npm workspaces and `.github/workflows/ci.yml`. Local Git main initialized. GitHub remote/publication/hosted CI pending; no commit/push performed.

## 16. README
[README.md](README.md): problem, solution, agentic rationale, features, architecture, contracts, lifecycle, memory/recovery/security, stack/tree, environment/database/local setup, API, tests/deployment/demo/screenshots/video status and future improvements.

## 17. Demo script
[DEMO_SCRIPT.md](DEMO_SCRIPT.md): 3–5 minute actual goal → tools → approval → supplier change → stale quote → replan → verification → final evidence. Fresh account recommended. Real-provider CLI acceptance took 3m 15.706s; a recorded human-clicked walkthrough remains pending.

## 18. Judge Q&A
[JUDGE_QA.md](JUDGE_QA.md): detailed answers on autonomy, planning, delegation, tools, recovery, prompt injection, memory, metrics, sandbox execution, security and scale.

## 19. Requirements traceability matrix
[REQUIREMENTS_MATRIX.md](REQUIREMENTS_MATRIX.md): all 55 challenge sections mapped to source/components/models/API/test/demo evidence and explicit acceptance gaps.

## 20. Agentic evidence
[AGENTIC_EVIDENCE.md](AGENTIC_EVIDENCE.md): per-claim implementation and persisted proof, with implementation/local/SDK/live evidence levels. UI exports task + execution + approval + audit JSON.

## 21. Final red-team findings
[docs/RED_TEAM.md](docs/RED_TEAM.md): fixed split-purchase bypass, approval preflight/binding/rejection replay, on-hand overpurchasing, duplicate order inflation, delayed deadlines, post-commit replay, interrupted records, approval reconciliation, ownership/concurrency, Unicode bcrypt validation, provider sanitization, false fixture provenance, missing tool schemas, invalid memory citations and ambiguous verifier deadlines.

## 22. Final evaluator score
Evidence-adjusted internal self-assessment **97.5/110 = 88.6%**, not an external judge score. Atlas persistence and actual Gemini execution are verified; public API/frontend deployment and production-origin/header checks remain unverified. The requested ≥90% submission acceptance threshold is not yet claimed met. Higher planning/coordination/reliability points reflect the observed live scenario, not a broad model benchmark.

## 23. Remaining risks
One live scenario passed; diverse goals, repeat-run model behavior/quota/latency and hosted configuration/connectivity still need evaluation. Production requires a 48+ character JWT secret. Purchasing and notification execution are internal sandbox operations, not external integrations. The bounded single-document ledger, single-SKU workflow and owner-only approval model need extension for high-volume enterprise use. No live video exists yet.

## 24. Future improvements
ERP/supplier adapters, external notifications, signed idempotent requests, richer reliability/demand optimization, multi-SKU planning, organization approver roles, normalized high-volume ledgers, durable worker scaling, cost telemetry and live-model regression benchmarks.

**Next submission action:** deploy the verified Gemini API/frontend with a production-length JWT secret, verify their public origins/headers and hosted workflow, then record the human-clicked live demo. Repository publication requires GitHub access and an explicit request to commit/push. Current measured evidence and actual UI captures are linked in `docs/LIVE_ACCEPTANCE.md` and `docs/screenshots/README.md`.
