# Agentic evidence ledger

**Evidence levels:** implementation = code exists; infrastructure execution = actual Mongo with explicit fixtures; SDK transport = native Google/OpenAI SDKs with mock HTTP; **live AI = actual Gemini + Atlas acceptance passed**; public web deployment = still pending. No fixture is an autonomy-quality claim. Measured live task: `6ac4afdcfb9b7088697d41dd`, 3m 15.706s; see `docs/LIVE_ACCEPTANCE.md`.

| Claim | Implementation | Persisted evidence / API | Verification |
|---|---|---|---|
| Goal understanding + autonomous planning | `agents/runner.js::plan`, native provider factory/adapters | Task.plan/planHistory, PLAN_CREATED; `/tasks/:id/plan` | Actual Gemini goal-generated plans stored in Atlas; two accepted revisions in successful run |
| Specialist delegation | `agents/contracts.js`, engine.advance | Per-step role and AgentExecution with provider/model/attempt; `/tasks/:id/agents` | Six roles executed in integrated fixture workflow; UI shows records |
| Tool selection | runner.act → role-specific schema → ToolGateway | Saved step.proposal and DECISION_RECORDED | Actual Gemini proposals selected tools/parameters from trusted input/output contracts; local semantics and gateway both validate |
| Real tool execution | `tools/registry.js`, `services/business.js` | ToolExecution; inventory/order/purchase changes and replay receipts | Actual Mongo mutations tested; no frontend status fabrication |
| Observe and decide | engine.advance, shared Task observations | Tool output appended before next invocation; decision rationale logged | Next specialist receives fresh context/observations |
| Replanning | engine.recover → REPLANNING → runner.plan | Revision counter, prior plans, PLAN_REVISED, failure observations | Withdraw actual supplier stock, approve old input, observe QUOTE_CHANGED, revision 2 and alternative purchase |
| Human approval | gateway + routes/approvals.js | Approval record, hash, exact input, status/decision; WAITING_FOR_APPROVAL | Database pause/resume, approve/reject, binding, IDOR and duplicate-decision tests |
| Outcome verification | verify_fulfillment + runner.verify + final invariant | Verification tool record, verdict, discrepancies and COMPLETION_INVARIANT_CHECKED | Actual allocation/spend/arrival checks; report blocked without passing evidence |
| Failure recovery | agent runner + engine.recover | Failed AgentExecution/ToolExecution, AI_RETRY, RETRYING, REPLAN_REQUESTED, ESCALATED | Malformed output, actual stock/version failure, transient conflict, budget infeasibility, bounded exhaustion |
| Persistent short-term memory | Task model | Plans, active/completed steps, agentOutputs, observations, workflowErrors, retries | Lease/restart tests recover from durable state |
| Long-term memory improves decisions | memory service + compare_supply | Memory source evidence, historicalFailures/reliabilityPenalty/memoryApplied | A subsequent supplier ranking changes due to stored failure evidence |
| Durable replay protection | business CAS + receipt + engine reconciliation | Original receipt + output.replayed; INTERRUPTED and WORKER_RECOVERED | Crash after approved purchase commit does not duplicate procurement |
| Real autonomy metrics | services/analytics.js | Counts from Task/ToolExecution/Approval/AgentExecution | Fixture runs assert exact derived values; no seeded analytics |
| Prompt-injection resistance | trustedRules + schemas + gateway policy | Denied tools/scope/excess purchase, failure logs | Goal stays user-data channel; code blocks malicious proposed actions |
| Real provider integration | Native Google `generateContent` + responseJsonSchema; optional OpenAI Responses | Provider/model invocation records, outputs, sanitized failures | Actual Gemini plans/actions/verdict/report passed; OpenAI's historical billing failure remains recorded |
| Billing failure is an account escalation | ai/errors.js + engine.recover | AI_BILLING_REQUIRED; one AgentExecution; ESCALATED with no plan/tools | Corrected actual provider run persisted in Atlas; no retry/replan storm |

## Judge reproduction
1. Review `docs/PRODUCT_DISCOVERY.md` and contracts.
2. Run `npm test` and `npm run test:ui`; note the provider is visibly **TEST_FIXTURE_NOT_AI**.
3. Configure a real backend key; run the normal application and `DEMO_SCRIPT.md`.
4. Inspect provider/model in the Agents tab, actual Tools inputs/results, plan revisions, approvals, verification, memory and chronological audit.
5. Export workflow JSON. Or use `npm run verify:live -- --approve-sandbox` for a provenance-labeled actual live execution artifact.

No static plans, synthetic agent timings, generated fake percentages or random statuses are used in the application. Timers schedule workers/polling/graceful shutdown and real Gemini rate pacing. Runtime `ai/factory.js` selects a native Gemini or OpenAI adapter from trusted environment configuration. Fixtures are under `backend/test/` and never imported by `src/server.js`. Actual UI captures read the completed live Atlas task.
