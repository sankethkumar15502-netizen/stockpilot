# REST API

Base: `/api`. JSON bodies; protected endpoints require `Authorization: Bearer <token>`. IDs are MongoDB ObjectIds unless named business IDs. All records are scoped to the current user; foreign records return 404. Use `/health` to discover AI configuration before starting.

| Method | Endpoint | Result |
|---|---|---|
| POST | /auth/register | 201 `{user, token}`; name/email/password (12–72 UTF-8 bytes) |
| POST | /auth/login | 200 `{user, token}`; email/password |
| GET | /auth/me | Current user; no password hash |
| POST | /auth/logout | Revoke all account token versions |
| POST | /tasks | 201 `{task}`; structured goal/context |
| GET | /tasks?cursor=id | Latest 50, `nextCursor` |
| GET | /tasks/:id | `{task, agents, tools, approvals, events}` |
| POST | /tasks/:id/start | 202; CREATED only, configured provider required |
| POST | /tasks/:id/cancel | Stop future steps; invalidate pending approvals |
| GET | /tasks/:id/plan | Current plan + history |
| GET | /tasks/:id/agents | AgentExecution records |
| GET | /tasks/:id/events?after=id | Up to 500 chronological events after cursor |
| GET | /approvals | Latest 100 current-user approval records |
| GET | /approvals/:id | Exact approval |
| POST | /approvals/:id/approve | `{reason?: string}`; pending only; resumes saved action |
| POST | /approvals/:id/reject | `{reason?: string}`; pending only; requests new plan |
| GET | /analytics | Database-derived metrics + definitions + recent activity |
| GET | /audit?cursor=id | Latest 100 audit events, `nextCursor` |
| GET | /business | Tenant business ledger (without receipt internals) + memory |
| POST | /business/initialize | `{}`; idempotently initialize safe demo inputs; no fake execution history |
| POST | /business/import | Initial custom inventory/orders/suppliers; fresh workspace only |
| POST | /business/disruption | `{supplierId, available}`; explicit enabled demo control increments quote version |
| GET | /contracts | Role contracts and actual tool JSON schemas |
| GET | /health | Public readiness/AI configuration/mode metadata; no secrets |

## Goal payload
```json
{
  "goal": "Recover urgent orders and verify allocations under the purchasing budget.",
  "context": {
    "orderIds": ["ORD-1001", "ORD-1002"],
    "maxBudget": 1500,
    "deadlineDays": 4
  }
}
```
Goal length 20–3000, scope 1–20 unique owned orders, one SKU per workflow, budget 0–100000, deadline 1–90 integer days. Overlapping active scopes are rejected. Budget and deadline are authoritative; natural-language input cannot enlarge them. Scheduled arrival is checked against workflow start + deadline, including elapsed approval time.

## Import payload
See `business-import.example.json`. Up to 50 inventory items/orders/suppliers per collection, total HTTP payload at most 32 KB. IDs unique; every order/supplier SKU references inventory; supplier costs positive with cent precision; no injected allocations/purchases/receipts accepted. Import does not overwrite initialized records.

## Agent action handoff
```json
{
  "tool": "place_purchase",
  "arguments": {
    "sku": "SENSOR-X1", "quantity": 22, "supplierId": "SUP-A", "expectedVersion": 1,
    "orderIds": null, "purchaseId": null, "message": null
  },
  "rationale": "This current quote covers the remaining deficit within budget and deadline.",
  "memoryUsed": []
}
```
Action outputs are validated against `actionSchema`, then the selected tool's stricter schema. Non-null unrelated fields are rejected. The tool gateway never accepts arbitrary tool names. Agent/tool contracts are available from authenticated `/contracts`.

## Errors and conflicts
```json
{
  "error": { "code": "WORKFLOW_CONFLICT", "message": "Only a created workflow may be started" },
  "requestId": "request-uuid"
}
```
400 validation/malformed JSON; 401 invalid/expired/revoked session; 403 role/origin/policy denial; 404 owned record not found; 409 state/scope/approval/quote conflicts; 413 oversized payload; 429 rate limit; 502 provider/structured-output errors; 503 missing AI/unready database. Provider bodies and secrets are never forwarded. Duplicate start/approval decisions return 409. Inventory/purchase replay after worker interruption returns the original mutation receipt rather than repeating effects.

Polling is ordinary REST: detail page every two seconds while visible, dashboard/analytics every five seconds. Read endpoints expose only persisted state; the frontend never advances workflow statuses itself.
