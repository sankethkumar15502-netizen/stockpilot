# Verification report

## Local evidence — 2026-10-06

| Check | Recorded result | Meaning |
|---|---|---|
| Backend syntax + frontend production build | Passed | Node syntax and Vite imports/routes/bundle compile |
| Backend tests | 37 tests passing | Actual MongoDB integration + both native SDK transports with mock HTTP + tool-contract/memory corrections and state checks |
| Browser tests | 2 tests passing in final acceptance run | Desktop full recovery workflow and 390px mobile protected navigation |
| Dependency audit | 0 vulnerabilities in recorded npm audit | Current locked dependencies; not a universal security guarantee |
| Normal local API | HTTP 200 /api/health, ready | Restarted with configured MongoDB Atlas and real provider credentials |
| Normal local frontend | HTTP 200 at localhost:5173 | Actual Vite application served |
| Normal-runtime browser smoke | Passed | Real registration/business initialization/goal creation; missing-key execution disabled, no fabricated plan or agent/tool progress |
| Current provider authentication/generation | Passed | Native Gemini `gemini-3.5-flash-lite`; actual structured plans, actions, verdict and report generated |
| Atlas connectivity | Passed | Real SRV Atlas connection, ping, and application task/execution persistence succeeded |
| Live generation / acceptance | **Passed — 3m 15.706s** | Task `6ac4afdcfb9b7088697d41dd`: real Gemini + Atlas, two accepted plans, approvals, stale-quote recovery, allocations, verification and report |
| Billing-failure recovery | Verified against actual provider | Corrected run logged `AI_BILLING_REQUIRED`, one agent attempt, zero retries/replans/tools, and ESCALATED |
| Live connected browser inspection | Passed | Normal UI displayed completed Gemini task/report, actual model records and derived metrics; isolated inspection session revoked |
| Render/Vercel | Pending | Backend/frontend public deployment credentials still unavailable; no public URL fabricated |
| Git | Local main repository initialized | No remote, commit or push claimed |
| CI | Configuration provided | Hosted GitHub Actions run pending repository publication |

## Commands
```bash
npm run check
npm test
npm run test:ui
npm audit
```
This environment initially lacked Chromium shared libraries and did not permit sudo. For the local browser run, required Ubuntu packages were downloaded/extracted under `/tmp/omnirush/browser-libs` and supplied through:
```bash
LD_LIBRARY_PATH=/tmp/omnirush/browser-libs/usr/lib/x86_64-linux-gnu npm run test:ui
```
The repository does not depend on that harness-specific directory. Normal CI uses `npx playwright install --with-deps chromium` on Ubuntu.

## Coverage exercised
Gemini-specific additions: native SDK request/JSON-schema projection/refusal/error handling, exact specialist tool-schema delivery and required-argument correction, scoped memory-reference correction before tools, explicit UTC verification anchors, and successful real-provider/Atlas execution with connected browser evidence.

Registration/hash/login/wrong password/invalid-expired-revoked sessions; create/plan/execute/complete; agent valid/malformed/permanent failure; real tool success/failure/invalid/unauthorized/scope; approval create/approve/reject/resume/binding/replay denial; transient retry/change-driven replan/escalation; cancellation; IDOR/NoSQL/CORS/Unicode/rate limits; custom data import/integrity/conflicts; overlapping scope concurrency; elapsed deadlines; independent check/report gate; memory-driven future ranking; approved purchase crash replay and interrupted-run reconciliation; actual OpenAI SDK Responses request/parsing/error/refusal handling via mock HTTP; desktop/mobile UI and no page errors.

## Evidence distinction
`backend/test/fixture-provider.js` is deterministic and explicitly labeled **TEST_FIXTURE_NOT_AI**. It is only loaded by tests. All test-side Mongo operations and tools are actual application code executing against an actual MongoDB server. SDK transport tests use a mock fetch; they prove compatibility of the adapter contract, not real credentials/quota or paid model behavior. Screenshot provenance is documented in `screenshots/README.md`.

## Historical provider failures and corrections
After backend credentials were supplied, authentication/model retrieval and Atlas connectivity passed. The first actual goal run was rejected by provider billing; a diagnostic request confirmed HTTP 429 with `credit_balance_exhausted`. The original generic 429 handling incorrectly treated this permanent account condition as transient and retried/replanned. The provider now classifies exhausted balance/billing limits separately from temporary rate limits, and the engine escalates immediately for billing/auth/model/request-configuration errors.

The corrected actual run persisted task `6ac4a4e2b55943d88ee2427e` in Atlas with one failed orchestrator invocation, `AI_BILLING_REQUIRED`, plan revision 0, zero retries, zero tools and zero approvals. Private provenance-labeled evidence: `backend/.local/live-evidence-6ac4a4e2b55943d88ee2427e.json`. It is a failed live acceptance artifact, never a successful autonomy claim. No secrets were displayed. The configured JWT secret also needs regeneration to meet the project's 48-character production minimum before deployment.

The user then supplied a Gemini key. Google model listing/authentication succeeded, but actual generation rejected Gemini 2.5 Flash for new users. Gemini 3.8 Flash returned valid structured output in a probe but also temporary high-demand errors. Generation-tested `gemini-3.5-flash-lite` was selected for low latency. Real runs exposed missing agent tool schemas, invalid memory citations and a verifier missing absolute deadline anchors. Exact tool contracts, semantic validation/correction, scoped memory enums, and explicit UTC verification evidence fixed these issues; the regression suite passed.

## Current actual live acceptance — passed

Command:
```bash
npm run verify:live -- --approve-sandbox
```
The normal Gemini/Atlas application completed task `6ac4afdcfb9b7088697d41dd` from `2026-10-06T08:22:52.588Z` to `2026-10-06T08:26:08.294Z`: **195,706 ms**. It reserved 8 units, rejected the approved stale supplier quote, replanned, approved/committed 22 units from SUP-B for $792, allocated orders 18/18 and 12/12, obtained a passing independent verdict, and published a report. The acceptance account's actual metrics were automation 90%, tool success 90.9%, two approval decisions and recovered completion. These are one-account execution measurements, not generalized performance claims.

Full private evidence: `backend/.local/live-evidence-6ac4afdcfb9b7088697d41dd.json`; public summary: `docs/LIVE_ACCEPTANCE.md`; actual UI captures: `docs/screenshots/*-live-gemini.png`. The earlier failed runs remain preserved. Public frontend/backend deployment, production-length JWT secret, deployed-origin/header checks and a demo video remain pending.
