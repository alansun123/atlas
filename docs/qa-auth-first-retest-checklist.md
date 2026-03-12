# Atlas QA Auth-First Retest Checklist — Sprint 2 WeCom Integration

> Date: 2026-03-13
> Role: QA (Atlas QA Engineer)
> Context: Sprint 1 mock MVP retest PASSED. Sprint 2 WeCom integration requires auth-first verification order and regression verdicts once credentials arrive.

---

## 1. Executive Summary

### Sprint 1 Status
- ✅ All 5 steps passed (backend startup, RBAC, state-machine, approval-detail, mock login chain)
- ✅ Demo-ready for Sprint 1 mock MVP

### Sprint 2 Auth Integration Status
- ✅ Backend auth smoke (`npm run test:auth`) **PASSES** in stub mode
- ✅ `/api/auth/wework/url` endpoint exists and returns valid payload
- ✅ `/api/auth/me` endpoint works with valid token
- ✅ `pendingAccess` handling for unmapped/inactive users
- ✅ RBAC guards (`test:rbac`) **PASSES**
- ✅ Approval-hardening (`test:approval-hardening`) **PASSES**
- ⏳ **BLOCKED**: Real WeCom acceptance pending credentials + callback environment

---

## 2. Auth-First Retest Checklist

> **CRITICAL**: Execute tests in the exact order specified below. Auth tests must run FIRST to validate the foundation before testing dependent features.

### Phase 1: Auth Foundation (MUST RUN FIRST)

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| 1.1 | `GET /api/auth/wework/url` | Returns 200 with OAuth URL payload (`url`, `loginType`, `mode`, `corpId`, `agentId`, `redirectUri`, `state`) | None |
| 1.2 | `POST /api/auth/wework/callback` with **mapped active user** | Returns 200, `accessToken`, `loginType=wecom`, `pendingAccess=false` | 1.1 |
| 1.3 | `GET /api/auth/me` with valid token | Returns 200, user profile (`userId`, `name`, `role`, `storeId`) | 1.2 |
| 1.4 | `GET /api/auth/me` with **invalid/malformed token** | Returns 401, `code: 2001` (AUTH_REQUIRED) | 1.2 |
| 1.5 | `GET /api/auth/me` with **missing token** | Returns 401, `code: 2001` | None |
| 1.6 | `POST /api/auth/wework/callback` with **unmapped user** | Returns 200, `pendingAccess=true`, `accessState=unmapped`, NO token | 1.1 |
| 1.7 | `POST /api/auth/wework/callback` with **inactive user** | Returns 200, `pendingAccess=true`, `accessState=inactive`, NO token | 1.1 |
| 1.8 | `POST /api/auth/wework/callback` with **invalid code** | Returns 400, error message | 1.1 |

### Phase 2: Auth Continuity (After Phase 1)

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| 2.1 | `GET /api/auth/me` after callback with **same token** (repeat request) | Returns 200, same user identity | 1.2, 1.3 |
| 2.2 | `POST /api/auth/logout` with valid token | Returns 200, explicit stateless logout note | 1.2 |
| 2.3 | `GET /api/auth/me` **after logout** with same token | Returns 200 (stateless - documented limitation) | 2.2 |

### Phase 3: Real Auth Mode (REQUIRES CREDENTIALS)

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| 3.1 | `GET /api/auth/wework/url` with `ATLAS_WECOM_AUTH_MODE=real` | Returns `mode=real`, real WeCom OAuth URL | Credentials |
| 3.2 | Real WeCom login flow (browser → callback) | Returns `loginType=wecom`, `wecomMode=real` | Credentials + Callback URL |
| 3.3 | Real callback with **active mapped user** | Returns token, `pendingAccess=false` | 3.2 |
| 3.4 | Real callback with **unmapped WeCom user** | Returns `pendingAccess=true`, `accessState=unmapped` | 3.2 |

---

## 3. Regression Pack

> These tests verify that auth integration did NOT break existing functionality.

### 3.1 Approval Detail Access Control

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| R-1 | Employee views **own** approval detail | Returns 200, approval data | Auth (employee token) |
| R-2 | Employee views **another employee's** approval | Returns 403 Forbidden | Auth (employee token) |
| R-3 | Manager views approval for **own store batches** | Returns 200 | Auth (manager token) |
| R-4 | Manager views approval for **other store** | Returns 403 Forbidden | Auth (manager token) |
| R-5 | Ops Manager views **any** approval | Returns 200 | Auth (ops token) |
| R-6 | Unauthenticated request to approval detail | Returns 401 | None |

### 3.2 RBAC Guard Coverage

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| R-7 | Employee creates schedule batch | Returns 403 Forbidden | Auth (employee token) |
| R-8 | Employee publishes batch | Returns 403 Forbidden | Auth (employee token) |
| R-9 | Employee submits approval | Returns 403 Forbidden | Auth (employee token) |
| R-10 | Manager (non-approver) approves approval | Returns 403 Forbidden | Auth (manager token) |
| R-11 | Manager creates/publishes batch | Returns 200 (allowed) | Auth (manager token) |
| R-12 | Ops Manager approves approval | Returns 200 (allowed) | Auth (ops token) |

### 3.3 State Machine Guard Coverage

| # | Test Case | Expected Result | Dependencies |
|---|-----------|-----------------|--------------|
| R-13 | Submit approval on batch already `pending_approval` | Returns same approval, `reused=true` | Auth + existing pending |
| R-14 | Approve already approved approval | Returns 400 (`当前审批单不可审批`) | Auth + approved approval |
| R-15 | Publish batch directly from `draft` (requires approval) | Returns 400 (`当前批次需审批后才能发布`) | Auth + draft batch |
| R-16 | Publish batch while `pending_approval` | Returns 409 (`审批中的批次不能直接发布`) | Auth + pending batch |
| R-17 | Publish already published batch | Returns 200, `alreadyPublished=true` (idempotent) | Auth + published batch |

---

## 4. Test Execution Order

> **STRICT ORDER** - Auth must be validated first before dependent features

```
┌─────────────────────────────────────────────────────────────┐
│ ORDER 1: Auth Foundation Tests (Phase 1)                    │
│   - All #1.x tests must pass BEFORE proceeding             │
│   - If any fail: STOP, report blocker                       │
├─────────────────────────────────────────────────────────────┤
│ ORDER 2: Auth Continuity Tests (Phase 2)                   │
│   - Requires Phase 1 success                                │
│   - Validates token persistence                            │
├─────────────────────────────────────────────────────────────┤
│ ORDER 3: Regression Pack - Approval Detail (R-1 to R-6)    │
│   - Requires valid auth token                              │
│   - Validates access control not broken by auth changes    │
├─────────────────────────────────────────────────────────────┤
│ ORDER 4: Regression Pack - RBAC (R-7 to R-12)              │
│   - Requires valid auth token                              │
│   - Validates role guards still enforced                   │
├─────────────────────────────────────────────────────────────┤
│ ORDER 5: Regression Pack - State Machine (R-13 to R-17)    │
│   - Requires valid auth + approval workflow                 │
│   - Validates business logic not broken                    │
├─────────────────────────────────────────────────────────────┤
│ ORDER 6: Real Auth Mode (Phase 3)                          │
│   - ONLY run after all stub tests pass                     │
│   - REQUIRES real WeCom credentials                        │
│   - REQUIRES reachable callback environment                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Prerequisites & Environment

### For Stub Mode Testing (Current)
```bash
cd atlas-server

# Required env vars for stub mode
ATLAS_AUTH_TOKEN_SECRET=qa-secret
ATLAS_WECOM_AUTH_MODE=stub
WECOM_CORP_ID=ww-qa
WECOM_AGENT_ID=1000001
WECOM_REDIRECT_URI=https://atlas.example.com/auth/callback

# Optional: custom code mappings
ATLAS_WECOM_CODE_MAP='{"qa_manager":{"weworkUserId":"manager_zhangsan","name":"张三"}}'
```

### For Real Mode Testing (Requires Credentials)
```bash
# Required additional env vars
ATLAS_WECOM_AUTH_MODE=real
WECOM_CORP_ID=<real-corp-id>
WECOM_AGENT_ID=<real-agent-id>
WECOM_SECRET=<real-secret>
WECOM_REDIRECT_URI=<reachable-callback-url>
ATLAS_WECOM_ALLOW_REDIRECT_OVERRIDE=false
```

---

## 6. Commands Reference

### Run Auth Tests
```bash
cd atlas-server
npm run test:auth
```

### Run RBAC Tests
```bash
cd atlas-server
npm run test:rbac
```

### Run Approval Hardening Tests
```bash
cd atlas-server
npm run test:approval-hardening
```

### Check WeCom Env Readiness
```bash
cd atlas-server
npm run check:wecom-env
```

### Run Full Acceptance Probe (Stub Mode)
```bash
cd atlas-server
npm run probe:wecom-acceptance
```

---

## 7. Pass Criteria

### Stub Mode (Current - Executable Now)
- [ ] Phase 1: All 8 auth foundation tests pass
- [ ] Phase 2: All 3 auth continuity tests pass
- [ ] Regression: All 17 regression pack tests pass

### Real Mode (Blocked - Requires Credentials)
- [ ] Phase 3: All 4 real auth tests pass
- [ ] End-to-end browser flow completes successfully

---

## 8. Known Limitations

1. **Logout is stateless**: `POST /api/auth/logout` does not invalidate tokens (documented)
2. **Real WeCom acceptance blocked**: Requires real credentials + callback environment
3. **Local user source is mock/in-memory**: Not suitable for production multi-environment testing

---

## 9. Evidence Paths

| Test | Evidence File |
|------|---------------|
| Auth smoke | `atlas-server/test-auth-smoke.js` |
| RBAC guards | `atlas-server/test-rbac-smoke.js` |
| Approval hardening | `atlas-server/test-approval-hardening-smoke.js` |
| WeCom env check | `atlas-server/scripts/check-wecom-env.js` |
| Acceptance probe | `atlas-server/scripts/probe-wecom-acceptance.js` |

---

## 10. Sign-Off

| Checkpoint | Status | Date | QA Engineer |
|------------|--------|------|-------------|
| Stub Mode Auth Foundation | ✅ PASS | 2026-03-12 | Atlas QA |
| Stub Mode Regression Pack | ✅ PASS | 2026-03-12 | Atlas QA |
| Real Auth Mode | ⏳ PENDING | - | - |

**Next Step**: Once real WeCom credentials arrive, execute Phase 3 tests in order.
