# Actual Gemini acceptance — passed

This is a measured execution of the normal application, **not a test-provider fixture**. Business input is explicitly sandbox seed data; all planning, actions, observations, approvals, verification and persistence executed through the actual system.

| Field | Observed value |
|---|---|
| Provider | Native Google Gemini (`@google/genai`) |
| Model | `gemini-3.5-flash-lite` |
| Database | MongoDB Atlas, actual application records |
| Task | `6ac4afdcfb9b7088697d41dd` |
| Started | `2026-10-06T08:22:52.588Z` |
| Completed | `2026-10-06T08:26:08.294Z` |
| Duration | **195,706 ms — 3m 15.706s** |
| Final state | COMPLETED |
| Accepted plan revisions | 2 |
| Human approval decisions | 2, through persisted approval endpoints with explicit CLI sandbox consent |
| On-hand reservation | 8 SENSOR-X1 units |
| Alternative procurement | 22 units from SUP-B / Beacon Industrial |
| Actual commitment | $792 of $1,500 maximum |
| Order allocations | ORD-1001 18/18; ORD-1002 12/12 |
| Remaining deficit | 0 |
| Independent verification | Deterministic checks and Gemini verdict passed |
| Tool attempts | 11 finished attempts: 10 successes, 1 genuine stale-quote failure |
| Automation rate | 90%, according to the API's documented successful-action definition |
| Tool success rate | 90.9%; intentionally induced failure retained in denominator |
| Failure recovery rate | 100% for this isolated account's one workflow; not a population benchmark |
| Final report | Persisted `REPORT-6ac4afdcfb9b7088697d41dd-r2-publish_report_final` |

## Actual lifecycle
1. Orchestrator generated a plan from the goal and business context.
2. Specialists inspected records, compared quotes and reserved on-hand stock.
3. The purchase proposal paused for an exact-action approval.
4. The acceptance script explicitly withdrew the quoted supplier's actual available stock, then approved the saved request.
5. Version checking rejected that purchase as QUOTE_CHANGED; the engine persisted the observation and supplier-failure memory.
6. The orchestrator generated a revised plan from current allocations, quotes and memory.
7. The alternative purchase received a second approval, committed supply and allocated it to both orders.
8. Verification checked actual allocations, purchase allocation, budget and absolute UTC arrival deadlines. Gemini returned a grounded passing verdict.
9. Communication published the final report; a fresh internal ledger check recorded COMPLETED.

## Final verification facts
- Deadline: `2026-10-10T08:22:52.588Z`.
- Incoming supply scheduled arrival: `2026-10-09T08:25:12.379Z`.
- All order allocations complete; all committed supply allocated; spend within budget; all arrivals before the deadline.
- Incoming goods are **scheduled/allocated**, not claimed physically delivered. No external supplier order or payment was sent.

## Evidence and browser provenance
Full exported evidence: `backend/.local/live-evidence-6ac4afdcfb9b7088697d41dd.json` (private/ignored by Git). Plans, agent/tool records, exact approvals, events, report and verification remain in Atlas. The script consent flag was `--approve-sandbox`; it only authorized the isolated account's sandbox purchases.

The normal React application was opened against the same completed Atlas task. The workflow/report, native Gemini invocation records and derived analytics were asserted and captured in `docs/screenshots/*-live-gemini.png`. This read-only inspection used a trusted server-side session for the known isolated CLI test account; the session was revoked through the normal logout API afterward. No production authentication bypass endpoint was added, and no token or API key was printed.

## Failures preserved and corrections
Earlier attempts are preserved as failure evidence. OpenAI ran out of API credit. Gemini 2.5 Flash was listed but rejected for new users; the larger current Gemini model had temporary high-demand errors. A generation-tested low-latency model was selected. Live runs also exposed missing tool schemas, hallucinated memory references and a verifier lacking absolute date anchors; these were corrected with exact tool contracts, local semantic validation/correction, scoped memory enums and explicit deadline/check evidence. Backend regression tests cover those fixes. The final successful run did not replace failures with fabricated history.

## Remaining acceptance
Public backend/frontend deployment, production-origin/header verification and a recorded demo video. This successful local application + hosted database run is not advertised as a publicly deployed frontend/backend.
