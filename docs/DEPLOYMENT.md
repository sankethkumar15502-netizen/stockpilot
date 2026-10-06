# Deployment: Atlas + Render + Vercel

## Verified status
Local frontend and API return HTTP 200, and **full native Gemini workflow acceptance passed against Atlas in 3m 15.706s**. The current model is `gemini-3.5-flash-lite`. Public API/frontend deployment remains pending platform credentials; configuration files are not evidence of a published service. Regenerate the JWT secret to meet the enforced 48-character production minimum before deployment.

## Atlas
Create a MongoDB database and least-privileged application user for `stockpilot`. Configure network access to the backend's egress addresses. Use the Atlas `mongodb+srv://.../stockpilot` connection URI (TLS enabled by SRV). Store the URI only in the backend service environment. Never include it in frontend `VITE_*` variables or Git history. Mongoose creates indexes at startup; permission to create required indexes is necessary.

## Render API/worker
1. Publish the repository to your own GitHub account, then create a Render Blueprint from `render.yaml` (or a Node web service with the same commands).
2. Set `NODE_ENV=production`, `MONGODB_URI`, `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, `GEMINI_REQUEST_INTERVAL_MS=12000`, `FRONTEND_URL=https://your-frontend-host`, and `JWT_SECRET` (48+ characters; generate 48 random bytes as hex). Explicit OpenAI selection remains available via its own key/model settings.
3. Build: `npm ci --omit=dev --workspace backend --include-workspace-root=false`.
4. Start: `npm run start --workspace backend`. Render supplies `PORT`.
5. `/api/health` must return ready and `aiConfigured=true`. Configuration presence does not prove that the provider credentials/quota work; run the full acceptance demo next.
6. Use one always-on backend instance for this MVP. Worker and API run in the same process; leases protect concurrent claims and recovery. A sleeping free service adds demo risk.
7. `ENABLE_DEMO_CONTROLS=false` by default. For the isolated judge sandbox, explicitly enable it to exercise supplier changes; purchasing still changes only the internal ledger.

Do not run the dev Mongo helper in production. Startup requires a hosted URI. The optional Docker build uses repository-root context: `docker build -f backend/Dockerfile .`. The Docker image is prepared but was not built here because container tooling is unavailable.

## Vercel frontend
Use the repository root as project root. `vercel.json` installs the workspace dependencies, builds frontend and publishes `frontend/dist` with SPA rewrites. Set `VITE_API_URL=https://your-api.onrender.com/api`, rebuild, and set the backend's exact `FRONTEND_URL` to the resulting HTTPS frontend origin. No backend secrets belong in frontend environment variables.

The frontend CSP allows self-hosted scripts and connections to Render subdomains; MUI's generated styles require `style-src 'unsafe-inline'`. For a custom API domain/Railway/Fly, change `connect-src` to the exact selected API origin before deployment. Use one stable frontend origin; unrelated preview origins are intentionally rejected by CORS.

## Acceptance procedure
1. Open hosted landing/register/login; confirm responsive layouts and protected navigation.
2. Initialize a fresh account's demo business input, or import your own validated JSON.
3. Create the documented goal and start live execution. Confirm AgentExecution provider is `gemini` with the selected model, not a test fixture.
4. Inspect the generated plan, tool inputs/outputs, actual inventory reservation and exact approval request.
5. Change quoted supplier stock through the explicit demo control before approving; confirm `QUOTE_CHANGED`, failure memory and `PLAN_REVISED`.
6. Approve the alternative. Confirm purchased supply allocations, independent verification and `COMPLETED`.
7. Inspect real analytics and audit; export evidence and attach a live demo video.
8. Log out and confirm the old JWT is rejected. Check another user's task/approval IDs return 404.

For automated acceptance against your isolated deployed sandbox:
```bash
SMOKE_API_URL=https://your-api.onrender.com/api npm run verify:live -- --approve-sandbox
```
The script requires a real Gemini or OpenAI provider and demo controls; it refuses fixture execution. It has already passed locally with Gemini and Atlas. Keep output evidence private until reviewing/sanitizing business information. Repeat against the deployed services and fill their actual URLs in `docs/VERIFICATION.md`; placeholders in this document are instructions, never claimed URLs.
