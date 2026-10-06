# Security architecture and reviewed controls

## Authentication and sessions
Passwords are bcrypt-hashed with cost 12; plaintext is not persisted or logged. Register/login validate bcrypt's 72-byte limit, including Unicode. JWTs use HS256 with explicit issuer/audience, subject and eight-hour expiry. The authenticated user's tokenVersion must match the database. Logout increments it, revoking all sessions. The frontend stores the short-lived bearer token in tab-scoped sessionStorage, never cookies; XSS would still threaten an active session, so escaping and CSP remain important. No refresh-token mechanism is claimed.

## Authorization / IDOR
Every API task/approval/audit/analytics/business/memory query is scoped by authenticated userId. Foreign IDs return 404. A tool can mutate only its workflow's SKU/order scope and owned purchase records. Agents have read/recommend/write/verify/publication permissions; orchestration is plan-only. The model cannot approve its own actions or choose authorization identifiers. Unique active-order indexes prevent competing workflows from managing the same scope.

## Secrets and provider boundary
Gemini/OpenAI and Atlas credentials are backend environment variables. `.env` and local data are ignored by Git. The frontend accepts only its API URL. Native Gemini sends the key in a header and uses explicit timeouts, bounded output and controlled rate pacing; OpenAI requests use `store:false`. Provider error bodies are sanitized, not forwarded. Model prompts never contain the API key, password hash or JWT. Production startup checks Mongo URI, the selected provider's AI key, HTTPS frontend origin and a 48+ character JWT secret. An empty key returns an honest configuration failure, not a fixture response.

Permanent provider billing/auth/model/request-configuration failures receive actionable sanitized codes and stop the workflow after one invocation. HTTP 429 exhausted credit or unavailable daily Gemini quota is distinguished from a retryable temporary rate limit. The actual Gemini workflow completed against Atlas; historical OpenAI billing failure is retained as evidence.

## Input / database security
Strict Zod schemas validate bodies, business imports, IDs, budgets, amounts, precision and scope. Request JSON is limited to 32 KB. Imported records cannot supply allocations, receipts or purchases; identifiers and references are validated. All database query shapes are written by trusted backend code; input objects never become arbitrary Mongo query filters. MongoDB owner/time/task indexes support bounded evidence reads. Atlas deployment uses TLS and least-privileged credentials.

## Tool execution and approvals
Tool names are checked with an own-property allowlist, then role permissions, input schemas and current task/lease state. Unused non-null fields are denied. Business preflight occurs before approval creation. Purchases taking cumulative task commitment above $250 require approval, preventing split-transaction bypass. Saved approvals bind SHA-256(tool + validated input), task, revision, actionId and owner. Changed quantity/supplier/version fails binding. A rejected exact purchase cannot reappear in a new plan.

Execution rechecks supplier version/stock, budget, maximum uncovered demand, on-hand/committed supply and elapsed-time deadlines inside the atomic domain write. CAS prevents concurrent lost updates; receipts prevent replay after a process interruption. Direct publication cannot bypass verified fulfillment. Cancellation blocks future steps, invalidates pending approvals and preserves committed actions; it cannot undo an atomic action already in flight.

## Prompt injection
Trusted system rules and role contract are separate from user goals, supplier descriptions, memory and tool results (all marked untrusted). External text has no access to secrets, policy, arbitrary tools, shell/JavaScript, filesystem, URLs or database queries. Every important output is structured and locally validated. Trusted tool definitions expose exact required input/output schemas. Role-specific output enums, full tool-input validation and scoped memory-reference enums trigger correction before execution. Google schema projection does not remove full server-side validation. A malicious valid JSON proposal still fails independent backend permission and business checks. Prompt instructions alone are not presented as a complete defense.

## Web controls
Helmet headers, disabled identifying header, explicit-origin CORS (no cookie credentials), API limit 1000 requests/15 minutes/IP and auth limit 20/15 minutes/IP. Rate errors carry consistent codes/request IDs. Production trusts one platform proxy hop. Bearer tokens are not ambient browser cookies, so normal cookie-based CSRF does not authorize API actions. React renders all model/user output as escaped text; there is no raw HTML rendering. Vercel CSP blocks external/inline scripts, objects and framing. MUI requires inline styles; `connect-src` is restricted to the deployed backend host family.

## Logs and audit
Audit records carry owner, task, timestamps, event and bounded business evidence. Auth events do not include passwords/tokens. Agent logs retain role/objective/memory IDs and validated output, not provider secrets or internal hidden reasoning. Unexpected request logs contain request ID/error class/code, not request body or provider response. Evidence exports can contain customer/business information and should be shared intentionally.

## Review evidence
Tests cover invalid/expired/revoked JWT, wrong password, foreign task/approval IDs, NoSQL-shaped inputs, malformed IDs, hostile origins, invalid tool parameters, arbitrary tool names, role/scope denial, approval binding, split purchases, rejected-action replay, cancellation, provider sanitization, import integrity, unique scope concurrency, replay receipts and bounded recovery. Dependency audits found no vulnerabilities at the recorded run. Browser tests cover protected navigation and actual escaped UI integration.

## Production recommendations and remaining boundaries
Use Atlas TLS/IP rules, managed secret storage, an always-on backend, HTTPS and a stable exact frontend origin. Disable demo controls for general usage. Separate organization roles before adding external purchasing/payment/email adapters; add signed idempotent external requests, stronger external failure handling and monitoring. SessionStorage does not eliminate XSS risk; this review is evidence of exercised controls, not a claim that vulnerabilities are impossible. See `docs/RED_TEAM.md` for specific findings and deployment/live verification gaps.
