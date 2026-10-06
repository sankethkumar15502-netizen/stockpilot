# Challenge requirements traceability

Paths below are relative to `backend/src/` (B) or `frontend/src/` (F), unless stated. Tests: **I** = `backend/test/integration.test.js`; **P** = `backend/test/provider.test.js`; **G** = `backend/test/gemini-provider.test.js`; **UI** = `tests/browser/workflow.spec.js`; **LIVE** = `backend/scripts/live-smoke.js` (**actual Gemini/Atlas acceptance passed**, task `6ac4afdcfb9b7088697d41dd`, 3m 15.706s). Fixture infrastructure checks and mocked SDK transports remain distinct from actual live evidence. See `docs/LIVE_ACCEPTANCE.md`.

| # / requirement | Implementation / backend file | Frontend / evidence | Model / API | Test / demo status |
|---|---|---|---|---|
| 1 Business automation / agentic theme | workflows/engine.js + agents/runner.js | WorkflowDetail, PRODUCT_DISCOVERY | Task, execution records; /tasks | I full execution; LIVE passed |
| 2 Mandatory stack | package manifests, app.js, config/database.js, ai/factory.js + native adapters | React/Vite/Router/MUI/Fetch | MongoDB, JWT REST | check/build/I/G; hosting pending |
| 3 Genuine agentic lifecycle | engine.advance/recover | WorkflowPlan/EventTimeline | Task/WorkflowEvent; /tasks/:id | I + UI mutation/approval/replan/check |
| 4 No fake application behavior | server.js uses native Gemini/OpenAI provider factory | Fixture banner only in test server | No seeded execution/metrics | Source review; explicit test provenance + LIVE |
| 5 Ten candidate problems / selection | docs/PRODUCT_DISCOVERY.md | Landing value proposition | N/A | Explicit weighted ratings, 95.5 selection |
| 6 Professional AI operations product | Goal-driven portfolio/ledger architecture | Dashboard/CreateWorkflow/WorkflowDetail | Task + BusinessState | UI desktop/mobile |
| 7 Meaningful specialist agents | agents/contracts.js, runner.js | Agents tab / activity | AgentExecution; /contracts | I six-role records + LIVE model invocations |
| 8 Explicit agent contracts / schemas | contracts.js + Zod schemas + exact tool contracts | Agents/evidence inspection | /contracts | P/G strict SDK format; I invalid output/tool/memory correction |
| 9 Real orchestration / mutable plan | workflows/engine.js | Plan + History | Task.planHistory; /tasks/:id/plan | I/UI supplier-change revision; LIVE two accepted plans |
| 10 Persistent shared state | models/index.js + engine.patch | Live detail | Task context/steps/outputs/observations/workflowErrors/timestamps | I lease/restart recovery; LIVE Atlas records |
| 11 Short/long-term memory | services/memory.js, tools.compare_supply | Business memory | Task + Memory; /business | I changed subsequent quote ranking |
| 12 Genuine tools + contracts | tools/registry.js | Tools tab | ToolExecution; /contracts | I actual Mongo updates/reads |
| 13 Critical execution boundary | tools/gateway.js | Inspect validated input/result | Roles/scope/hash; tool records | I role/arbitrary-tool/scope denial |
| 14 Risk + approval persistence | gateway.js, routes/approvals.js | ApprovalCard/Approvals | Approval; approve/reject endpoints | I + UI pause/resume/binding |
| 15 Real autonomy metrics | services/analytics.js | Dashboard/Analytics | Records; /analytics | I exact counts; LIVE 90% automation / 90.9% tool success in isolated account |
| 16 Persistent state machine | workflows/state-machine.js | StatusBadge/plan states | Task.status; /tasks/:id | P terminal/invalid transition denial |
| 17 Malformed output/tool/changed state recovery | runner.js + engine.recover | History/errors/events | Errors/attempts/plan revisions | I retries/replan/escalation |
| 18 Prompt injection | trustedRules + gateway policy | Escaped text | Denied action/evidence events | I adversarial goal and excess purchase |
| 19 AI output validation | Full Zod schemas + role/tool/memory semantics + runner.invoke | Validated outputs tab | AgentExecution output/error | I malformed/tool/memory correction; P/G; LIVE |
| 20 Useful database design/indexes | models/index.js | Persisted views | Eight purposeful entities, embedded subtasks/notifications | I real DB/index/concurrent scope |
| 21 Auth/register/login/JWT/bcrypt/logout | routes/auth.js, middleware/auth.js | AuthPage/Protected/AuthContext | User; auth endpoints | I hash/login/wrong/expired/revoked |
| 22 Clean modular backend | agents/ai/config/models/routes/services/tools/workflows | N/A | REST contracts | Syntax checks + source inspection |
| 23 Modular reusable frontend | components/pages/layouts/hooks/context/services | App routes + shared components | Fetch API | Build + UI |
| 24 All required pages | API routes supporting all views | Landing/Login/Register/Dashboard/Create/Live/Detail/Approvals/Analytics/Audit | Owned REST reads | UI navigation; terminal detail shares live route |
| 25 Actual live visualization | Persisted task detail | useResource 2s poll / WorkflowPlan | /tasks/:id | UI actual backend states, no client progress |
| 26 Professional responsive UX | API errors and explicit modes | MUI theme/CSS/loading/empty/error/confirm/toast | Resource states | UI desktop/mobile, pageerror checks |
| 27 Documented required API endpoints | routes/*.js, docs/API.md | Corresponding pages | Auth/tasks/plans/agents/events/approvals/analytics/audit | I required endpoint reads/actions |
| 28 Consistent errors/conflicts | utils/errors.js, app error handler | Retry/error UI | error code/message/requestId | I malformed/auth/scope/start/approval conflicts; P provider |
| 29 Security audit and fixes | Gateway/auth/validation/CAS | CSP/escaped UI | Owner-bound records | SECURITY + RED_TEAM + I + audit |
| 30 Environment examples / no secrets | backend/.env.example, config/env.js | frontend/.env.example URL only | No frontend key | Source/secret scan, prod checks |
| 31 Verified provider API and meaningful AI | ai/gemini-provider.js + optional OpenAI; official docs in DEPLOYMENT | Agents provider/model | Native Gemini JSON schema / optional OpenAI Responses | P/G SDK/mock HTTP; actual LIVE generation passed |
| 32 Agentic evidence document | AGENTIC_EVIDENCE.md | Trace to UI exports | Trace to records/API | Evidence levels explicit |
| 33 Requirements matrix | This file | Exact components cited | Exact models/API cited | Test/demo references per row |
| 34 Meaningful test breadth | backend/test, tests/browser | Browser-run application | Actual isolated Mongo | 37 backend I/P/G tests; UI; LIVE passed |
| 35 Reliable 3–5 minute demo | DEMO_SCRIPT + live-smoke.js | Supplier withdrawal control | Business quote changes + approvals | UI fixture path passes; actual LIVE 3m 15.706s; video pending |
| 36 Distinguish demo input from execution | business.initialize/import | Business input labels/test banner | No seeded analytics/history | I no purchases before execution; UI |
| 37 README contents | README + linked detailed documents | Actual screenshots | API/database/setup links | Documentation review |
| 38 Architecture diagram | ARCHITECTURE + README Mermaid | Landing conceptual diagram labeled | Actual engine/tool/DB flow | Source-to-diagram review |
| 39 SECURITY.md | SECURITY.md | Auth/approval/CSP handling | Backend-only keys/ownership | I/P/audit review |
| 40 Demo script | DEMO_SCRIPT.md | Practical timed walkthrough | Live actual endpoints | Actual CLI acceptance passed; human-clicked recording pending |
| 41 Judge Q&A | JUDGE_QA.md | Evidence tabs referenced | Records/contracts | Honest sandbox/live boundaries |
| 42 Evaluator-visible structure | Descriptive agents/tools/workflows/services | Modular UI/evidence export | Indexed evidence models | Source review + matrix |
| 43 Adversarial review / fixes | docs/RED_TEAM.md | Fixture disclosure, confirmation, responsive UI | Split/binding/replay/on-hand/elapsed deadline | Expanded I/P/UI regressions |
| 44 Weighted score / standards | docs/RED_TEAM.md scorecard | No fake score analytics | N/A | Self-assessment, target not claimed met |
| 45 Code quality/modularity/current APIs | Workspace lock; modular source; current SDK/MUI slots | Lazy-routed pages | Strict contracts / no arbitrary execution | check/build/audit/I/UI |
| 46 Phased implementation | Architecture → backend → UI → tests → docs/config → live acceptance | All core pages implemented | All core entities/endpoints | LIVE passed; public deployment pending platform access |
| 47 Inspect existing project / preserve work | Initial workspace inspection found no app | New directory /home/sanke/stockpilot | No existing data overwritten | New project; import refuses overwrite |
| 48 Debug failures / verify correction | Fixed reserved field/new-option issues; sync-test bug | Fixed accessible-label selectors | Recovery mutation/replay checks | Subsequent relevant regression runs |
| 49 Never claim without evidence | VERIFICATION + provenance levels | Separate fixture/live captures | /health configuration ≠ live success | Actual LIVE measured; hosting explicitly pending |
| 50 Submission checklist | README, evidence, verification, matrix | Core frontend verified locally | Core backend + Gemini/Atlas verified | Platform access/hosting/video listed |
| 51 Final submission artifacts | README/ARCHITECTURE/API/SECURITY/DEMO/Q&A/evidence/matrix/red-team | Screenshots + actual local URLs | Schema/API/folder documentation | No fictitious deployment URLs |
| 52 Actually build with tools | Full source and locked dependencies | Built connected application | Actual Mongo mutations tested | I/P/UI + local HTTP smoke |
| 53 Minimum unnecessary complexity | One Express API/leased worker; six scoped invocations | REST polling, MUI reuse | One Mongo DB; bounded ledger | No agent framework/queue/microservices |
| 54 Judge-visible goal-to-verified-action loop | engine + gateway + memory + verifier | Plan/agents/tools/approvals/history/final/audit | All real records | Whole local loop and actual LIVE passed |
| 55 Immediate discovery then implementation | PRODUCT_DISCOVERY + full workspace | All core views | Full system | Discovery weighted; build/tests complete locally |

## Remaining acceptance requirements
Actual native Gemini generation, Atlas persistence and the full goal-to-verified-action acceptance passed in 3m 15.706s. Frontend/backend public deployment, production-length JWT secret, hosted origins/headers/full workflow checks, repository publication and a human-clicked demo video remain pending. Historical OpenAI billing and early Gemini model/schema failures are preserved; permanent account/configuration errors escalate rather than creating a retry storm. One successful scenario does not establish broad model quality or repeat-run reliability. No pending requirement is substituted by fixture evidence or a fabricated URL.
