# Adversarial review and evaluator score

## Evidence standard
This review is supported by actual MongoDB integration, native SDK/mock-HTTP transport checks, browser tests, source inspection and a successful actual Gemini/Atlas acceptance. The live task `6ac4afdcfb9b7088697d41dd` completed in 3m 15.706s with two accepted plan revisions and stale-quote recovery; see `LIVE_ACCEPTANCE.md`. This is one controlled live scenario, not a broad model benchmark or a hosted penetration test. Fixtures are clearly labeled and cannot be selected through production APIs.

## Findings investigated and fixes

| Attack / evaluator objection | Finding and correction | Regression evidence |
|---|---|---|
| “It's just a chatbot.” | Completion requires actual allocations, spend/arrival checks, independent verdict and persisted report; model text alone cannot complete. | Full workflow I/UI; unverified report denied |
| “Agents or tools are fake.” | Production selects native Gemini/OpenAI adapters through ai/factory.js. Fixtures remain exclusively under backend/test; UI exposes provider/model and explicit fixture banner. Tools mutate actual Mongo data. | Both SDK transport tests + Mongo effects + actual Gemini agent records/live captures |
| “Plan is hardcoded.” | Runtime has no plan templates/generator fallback. Model returns specialist steps; semantic plan checks enforce evidence gates, not a fixed task sequence. | Actual Gemini created two accepted plans following a real supplier change |
| “Analytics are invented.” | Derived from execution records; successful actions deduplicated by actionId; null denominators are shown honestly. | Exact analytics assertions after actual tool effects |
| “Approval is a popup.” | Persisted Approval and WAITING state; hash binds tool/input; approval decisions use authenticated API and atomic pending-only update. | Approve/reject/resume/repeated decision/IDOR tests |
| Split purchases bypass threshold | Per-action amount alone could allow splitting. Changed policy to cumulative workflow commitment, enforced again in domain mutation. | $240 purchase followed by $150 request requires HIGH approval |
| Approving an infeasible action wastes human work | Previously budget checks only occurred inside execution. Added full preflight before approval, then recheck under CAS. | Budget-infeasible proposal creates no Approval |
| Changed params reuse approval | Exact hash check now independently verifies validated tool input. | Approved quantity changed → APPROVAL_MISMATCH |
| Rejected proposal is repeated after replan | New revision could generate same exact request. Added lookup rejecting a human-rejected hash across revisions of that task. | REJECTED_ACTION_REPEATED |
| Buy stock already on hand | Purchase deficit initially ignored unreserved on-hand inventory. Added on-hand + committed coverage to maximum purchasing quantity. | Excess purchase rejected even with approval |
| Duplicate order IDs inflate demand | Duplicated IDs could miscount outstanding demand. Added unique tool order scope and complete-allocation invariant. | Duplicate reservation leaves inventory/order records untouched |
| Approved quote becomes stale | Execution/preflight verify quote version; actual demo change increments version. | QUOTE_CHANGED → memory → revision → alternate approval → completion |
| Delayed approval invalidates deadline | Comparing only raw leadDays ignored elapsed approval time. Compare arrival against start + deadline, retain scheduledArrivalAt for independent verification. | Five-day elapsed task with four-day deadline fails procurement |
| Crash after purchase duplicates effects | Preflight could reject an already-committed request because quote/deficit changed. Check durable receipt first; mutation returns original result. | Crash-after-purchase replay produces exactly one commitment |
| Stale records say “running” after restart | RUNNING execution records could remain indefinitely. New lease claim marks old attempts INTERRUPTED and logs recovery. | Tool/agent interrupted reconciliation test |
| Approval decision saved, resume write interrupted | Added decided-approval reconciliation on startup and regular worker ticks. | Saved APPROVED record resumes after reconciliation |
| Foreign task/approval IDs | All reads/actions scoped to authenticated owner; tool purchase/order scope checked independently. | Foreign API IDs return 404; tool scope rejected |
| Prompt injection / arbitrary execution | Separate trust channels plus strict allowlist, role permissions, no arbitrary network/code/query interface. | Malicious goal/excess purchase/arbitrary tool tests |
| Prototype/inherited “tool” | Tool allowlist now requires Object.hasOwn before looking up the implementation. | Code review; unknown-tool tests |
| Bcrypt Unicode truncation | Added UTF-8 byte limits to both registration and login, not only JS character limits. | Unicode >72 bytes rejected |
| Provider leaks secrets in errors | Sanitize SDK error bodies; store only safe code/message and bounded invocation metadata. | Mock HTTP secret-bearing error not exposed |
| DB outage looks like invalid JWT | JWT parsing and DB lookup errors separated; DB connectivity returns 503 without falsely revoking bearer session. | Source review; UI preserves token on non-401 me error |
| NoSQL injection / bad imports | Strict schemas, backend-written filters, relationship/precision checks and initialization refusal. | Object-shaped email, invalid refs/duplicate IDs/precision rejected |
| Competing scope requests | Application existence checks alone race. Added Mongo unique partial multikey active-scope index. | Concurrent overlap yields exactly one 201 and one 409 |
| Mongoose reserved “errors” field | Renamed task errors to workflowErrors to avoid reserved path behavior. | Recovery regression tests pass without reserved-field warning |
| Deprecated persistence/UI APIs | Replaced new:true with returnDocument:'after'; MUI props migrated to slotProps. | Check/build/browser tests |
| False live claims/screenshots | Fixtures visibly labeled; separate Gemini captures show actual persisted live records; public hosting remains explicitly pending. | Screenshot provenance, live evidence export and source entrypoint review |
| Permanent billing errors cause a retry/replan storm | Actual HTTP 429 `credit_balance_exhausted` was treated like a temporary rate limit. Added sanitized billing/auth/model/request classification and immediate account-level escalation. | Provider regressions within 37 backend tests; historical corrected run recorded one invocation and zero retries/tools |
| Model guesses tool parameters | A live Gemini proposal omitted a required tool field. Supply exact trusted input/output schemas and role-specific tool enums; validate full tool input and send correction before execution. | Required-argument correction regression; actual final live run completed |
| Model invents memory citations | Live output cited an ID outside the supplied context. Restrict memoryUsed to scoped stored-ID enums, or an empty array when no memory exists. | Scoped-memory correction regression; no invalid citation reaches tools |
| Verifier invents a tighter deadline | Live verifier interpreted relative evidence without absolute task anchors. Supply UTC start/deadline/check timestamps plus deterministic checks and prohibit invented delivery requirements. | Final actual verdict passed against the scheduled arrival and authoritative four-day deadline |

## Remaining significant acceptance gaps
1. Actual Gemini planning, tool selection, recovery and verification passed in one controlled scenario. Diverse goals, repeated-run reliability, provider-quota behavior and model-quality benchmarks still need broader evaluation; the earlier OpenAI account remains unfunded.
2. Atlas connectivity and application persistence passed. Render/Vercel credentials are still unavailable: public API/frontend URLs, complete production workflow and real deployed web headers remain unverified. The JWT secret must meet the 48-character production minimum before deployment.
3. Actual acceptance met the 3–5 minute target in 3m 15.706s. Sandbox approvals were explicit CLI consent; a recorded human-clicked walkthrough and public video URL remain pending.
4. External suppliers/email/payments are not integrated; the product executes an explicitly sandboxed business ledger.
5. Domain ledger/receipts are bounded-document MVP data, analytics scan tenant records, and the recommended service is one instance. High-volume production needs normalized data and worker scaling.
6. Approvals belong to the workflow owner; distinct organization roles, email verification and refresh-token sessions are future extensions.

The locally reproduced findings above were corrected and checked through regressions or subsequent live evidence. Credential-dependent acceptance cannot be truthfully replaced by a test fixture.

## Evidence-adjusted self-evaluation (not an external judge score)

| Category | Weight | Current assessed points | Rationale |
|---|---:|---:|---|
| Problem quality |10|10|Weighted business selection; tangible order/stock problem|
| Innovation |10|8|Auditable recovery, exact approval and evidence memory|
| Agentic authenticity |20|18|Actual model-generated plans/actions, approvals, changed-state recovery and verification; one live scenario|
| Multi-agent coordination |10|9|Six scoped roles; durable handoffs verified with fixtures and actual Gemini records|
| Tool use |10|10|Actual Mongo effects, schemas, permission/policy checks|
| Autonomous planning |10|9|Actual Gemini created and revised plans after changed supplier state; broader goal benchmarks pending|
| Execution |10|9|Actual allocations/commitments/checks; sandbox integrations only|
| Human-in-loop |5|5|Pause/resume/reject/hash/cumulative policy tested|
| Reliability |5|4.5|Retries/replan/escalation/idempotent recovery checked; actual recovered completion in 3m 15.706s|
| Security |5|4.5|Reviewed controls and adversarial regressions; hosted audit pending|
| UI/UX |5|4.5|Desktop/mobile browser checks, evidence-oriented screens|
| Deployment |5|1|Atlas connection/persistence verified; public API/frontend deployment pending|
| Documentation |5|5|Architecture/evidence/traceability/security/demo/Q&A and honest provenance|
| **Total** |**110**|**97.5**|**88.6%**|

The ≥90% overall submission threshold is **not yet claimed met**. Live evidence supports internal 9/10 planning and normalized 9/10 agentic assessments for this scenario; those are not independent evaluator results or broad reliability guarantees. The score increased only for newly observed live planning, coordination and recovered execution. Public deployment/production verification and broader evaluation remain outstanding. Do not advertise this score as a judge result.
