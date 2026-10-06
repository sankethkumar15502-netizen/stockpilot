# Five-minute live demo

## Prerequisites (before the clock)
Start the normal app with a real backend `GEMINI_API_KEY` and MongoDB Atlas. The verified model is `gemini-3.5-flash-lite`, with 12-second request pacing. Actual acceptance completed in **3m 15.706s**; network/model latency and human decision time may vary. Confirm `/api/health` reports Gemini and the selected model. Use a fresh account with seed inputs, budget $1,500 and four-day deadline. Enable explicit demo controls only for the sandbox. Keep the live execution view and business context visible. **Do not present fixture screenshots as live AI evidence**; use the separately labeled live Gemini captures.

## 0:00–0:30 — Problem
“An operations manager has 30 urgent sensor units ordered, but only eight on hand. Fulfillment requires inventory allocation, supplier comparison, procurement approval, and outcome checking. Supplier availability can change while a purchase is being approved.” Show the business context: two orders, eight units, supplier A $30/2 days, supplier B $36/3 days, supplier C $22/9 days.

## 0:30–1:00 — Solution and boundaries
“StockPilot turns a business goal into a persisted execution plan. Six scoped specialist roles share state. Every model proposal passes a tool gateway; the backend enforces authority, budget, deadline and approval.” Briefly show the diagram in `ARCHITECTURE.md`. State clearly that purchases are internal sandbox commitments, not external supplier orders.

## 1:00–2:00 — Create goal and dynamic planning
Create a workflow with both orders selected, budget 1500 and deadline four days:

> Recover both urgent SENSOR-X1 orders within four days. Reserve available stock, compare supplier options, purchase only the shortfall within budget, allocate incoming supply, independently verify fulfillment and publish an operations report.

Click **Start live execution**. Show actual PLANNING, persisted plan, specialist assignments and goal-specific objectives. Open Agents to show `gemini` / `gemini-3.5-flash-lite` and validated outputs. The exact plan and wording may vary; do not promise a static sequence from a recording.

## 2:00–3:00 — Tool use and human authority
Show research and comparison tool results: eight on hand, 22-unit deficit, cost/deadline feasibility. Show the actual reservation reducing available inventory to zero and increasing order allocation. Explain why the nine-day supplier is infeasible. Open the persisted purchase approval (typically supplier A, 22 × $30 = $660). Show exact input, quote version and binding hash.

## 3:00–3:45 — Approval and verification boundary
Before approving, click **Withdraw quoted supplier stock**. This writes a genuine availability change and increments that supplier's quote version. Then approve the saved purchase. “Approval gives permission to attempt this exact request; it does not make an outdated quote valid.” Show the real `QUOTE_CHANGED` failure, recorded ToolExecution and failure observation. If the model initially selected another supplier, the control targets that actual quoted supplier automatically.

## 3:45–4:30 — Replan and verify
Watch REPLANNING and the next persisted plan revision. Open history to compare plans. Show the fresh quote/tool observation and alternate supplier decision. Approve the alternative purchase (typically supplier B, 22 × $36 = $792). Show purchase commitment, incoming allocation and independent verification. The backend also considers elapsed approval time; no approval can bypass the deadline or budget.

## 4:30–5:00 — Evidence, metrics and result
Show the final report and COMPLETED state. State the exact verified result: 30 units allocated across on-hand and scheduled incoming supply, actual committed spend, deadline check, and no claim of physical delivery. Show source-derived analytics, supplier failure memory, chronological audit and **Export evidence**.

Closing: “This system does more than suggest a solution: it plans, delegates, uses tools, observes a failure, changes the plan, obtains approval, executes real ledger actions and verifies them.”

## Reproducibility / recovery
Use a fresh account for each full demo so prior stock allocations do not remove the deficit. If provider/network errors occur, show their real retry/escalation evidence. Never switch to an undisclosed fixture to pretend the live demo succeeded. `npm run verify:live -- --approve-sandbox` runs the same actual API-based recovery path and writes evidence when credentials are available; the Gemini/Atlas run already passed. A live video is pending; record a fresh human-clicked walkthrough.
