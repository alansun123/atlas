# Atlas Project Status

**Last updated:** 2026-04-06 01:53 CST
**Watchdog state:** ACTIVE — Sprint2 in progress, WeCom QR OAuth implemented; WeCom handoff blocker resolved 2026-03-22

---

## Sprint 1 ✅ COMPLETED

All P0/P1 items landed. Mock E2E retest passed 2026-03-12.

| Test | Result |
|------|--------|
| Employee: login → schedule | ✅ PASS |
| Manager: create batch → submit approval | ✅ PASS |
| Ops Manager: approve | ✅ PASS |
| Manager: publish | ✅ PASS |
| Employee: see published shift | ✅ PASS |

---

## Sprint 2 🚧 IN PROGRESS

**Blocker:** ✅ RESOLVED — WeCom credentials received 2026-03-22

**Obtained credentials:**
- `CorpID`: `ww836bae156556f03f`
- `AgentID`: `aibhh8SklrT3Hs02kh4FlU4zXvb01qADRA6`
- `Secret`: provisioned (in `.env`)
- Credentials written to `atlas-server/.env` and `atlas-web/.env`

**Current state (2026-04-06 01:53 CST — no new commits since 2026-03-23):**
- atlas-web: running (port :3000, Next.js)
- atlas-server: **STOPPED** (port :4700) — not listening, may need manual restart
- PostgreSQL: running (Docker, port :5432)
- WeCom QR OAuth flow fully implemented in working tree
- `GET /wework/qr` — builds QR connect URL, returns `qrUrl` + `state` (expires 5min)
- `GET /wework/callback` — exchanges code for WeCom user identity, handles:
  - Existing active user → issues session, redirects to `/home?token=...`
  - New user → redirects to `/pending-access?weworkUserId=...`
  - Inactive/unusable user → redirects to `/pending-access` with status reason
- Frontend LoginView updated with QR code login button (opens `open.work.weixin.qq.com` QR in popup)
- `fetchWeComQrUrl()` added to frontend API layer
- `dotenv` loaded in `app.js` for env var access

**Pending tasks (P0):**
- [ ] `POST /wework/callback` variant (for direct API callers)
- [ ] `/pending-access` page UI (first-login user onboarding)
- [ ] Frontend popup → main window token传递 (postMessage or polling)
- [ ] Integration test with real WeCom OAuth flow

---

## Workers

No active subagents.

---

## Next Action

Continue Sprint 2 implementation:
1. Finish user identity exchange (POST /wework/callback)
2. Wire up user creation on first login
3. Connect frontend callback handler
4. Run integration test with real WeCom OAuth

---
