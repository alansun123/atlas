# Atlas Tech Lead Source of Truth — Sprint 2 acceptance, sequencing, and ownership

> 单一事实源（single source of truth）
> 更新时间：2026-03-12
> 维护角色：Tech Lead
> 当前基线：`eb99e95` on `main`
> 适用范围：Tech Lead / PM / Backend / Frontend / QA / Ops

## 1. Frozen status

### Sprint 1
**Sprint 1 mock MVP is done and demo-ready.**

This is no longer an open delivery gate.
- Reference: `docs/qa-final-mock-retest-2026-03-12.md`
- Tech Lead implication: do **not** keep planning as if Sprint 1 still needs final closure work.

### Sprint 2
**Sprint 2 P0 is now two-part and must be executed in order:**
1. **real WeCom auth acceptance**
2. **frontend fallback-risk tightening in real-login mode**

This reflects current repo reality:
- backend auth contract is already at **stub/integration PASS**
- real WeCom E2E is still **pending environment-backed acceptance**
- frontend still has hybrid API + fallback paths that can mask integration failures

References:
- `docs/watchdog-status-next-steps-2026-03-12.md`
- `docs/qa-wecom-auth-watchdog-2026-03-12.md`

---

## 2. Frozen acceptance wording

### 2.1 Sprint 2 auth acceptance
Sprint 2 auth should only be described as accepted when **all** of the following are true:

1. A real user can start from the WeCom login entry and complete callback successfully.
2. Backend callback returns the correct branch for each case:
   - active mapped user -> signed session/token
   - unmapped or inactive user -> `pendingAccess`
3. `GET /api/auth/me` reflects the same identity and role after callback and after page refresh.
4. Session failure is observable and recoverable:
   - expired/invalid session does not look like a successful login
   - frontend clears bad session state and returns user to the correct entry path
5. Three real test identities are verified end-to-end at least once:
   - employee
   - manager
   - operation manager

### 2.2 Frontend fallback-risk acceptance
Frontend is only considered acceptable for Sprint 2 real-login mode when **all** of the following are true:

1. Real-login mode does **not** silently preserve an invalid session.
2. Real-login mode does **not** silently hide failure on these key paths:
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
3. If fallback remains temporarily, UI must explicitly signal that fallback/mock data is being shown.
4. Home/dashboard mock content, if still present, is explicitly marked as non-acceptance evidence.

### 2.3 What is not accepted wording anymore
The following descriptions should be treated as stale and not reused:
- “Sprint 1 still needs final closure before it is demo-ready.”
- “Backend WeCom callback is still just a placeholder.”
- “Frontend auth is still mock-first callback-only.”
- “Sprint 2 priority is broad feature expansion before real auth acceptance.”

---

## 3. Role sequencing and ownership boundaries

### Sequence 1 — Tech Lead / PM
**Goal: freeze scope and acceptance language.**

Owner responsibilities:
- keep this document as the planning source of truth
- prevent Sprint 1 work from being reopened as a pseudo-P0
- keep Sprint 2 scoped to auth acceptance first, fallback tightening second
- assign owners without mixing implementation layers

Exit condition:
- all roles align on the acceptance wording in section 2

### Sequence 2 — Ops + Backend
**Goal: make real WeCom E2E executable.**

Owner responsibilities:
- provide real WeCom test tenant/app configuration
- provide reachable callback environment/domain
- verify credential/config readiness
- verify `weworkUserId -> Atlas user` mapping for three test identities
- run the real callback path and confirm `/auth/me` continuity

Not owned here:
- broad business-page refactors
- frontend fallback UX cleanup beyond what is needed to expose auth truthfully

Exit condition:
- real auth path is runnable with three real identities

### Sequence 3 — Frontend
**Goal: stop masking auth/integration failures in real-login mode.**

Owner responsibilities:
- keep login and callback on real-auth-first path
- tighten session bootstrap so invalid session is cleared, not preserved
- remove or surface silent fallback behavior on key pages
- keep any remaining demo-mode behavior clearly separated from real-login mode

Not owned here:
- redefining backend auth contract
- inventing new acceptance criteria
- broad dashboard redesign

Exit condition:
- a failed backend/auth state is visible as failed, not falsely usable

### Sequence 4 — QA
**Goal: verify identity chain first, business chain second.**

Owner responsibilities:
1. test real login success path
2. test `pendingAccess` path
3. test refresh/session continuity via `/auth/me`
4. test invalid/expired session handling
5. only then test business pages under real-login mode

Not owned here:
- deciding scope
- compensating for silent fallback with informal interpretation

Exit condition:
- QA can say clearly whether real auth is accepted and whether fallback still masks defects

### Sequence 5 — Backend follow-up
**Goal: improve durability after auth acceptance is real.**

Owner responsibilities:
- move local user source from mock/in-memory toward durable persistence as needed
- keep `req.user` contract stable for downstream modules
- treat persistence migration as post-auth-acceptance work unless it blocks acceptance directly

Exit condition:
- persistence work is sequenced after auth acceptance, not before it

---

## 4. Immediate next steps

### Must happen now
1. **Tech Lead:** point the team to this doc as the only planning/alignment source.
2. **Ops + Backend:** prepare real WeCom environment and three real mapped identities.
3. **Backend:** execute one real acceptance run covering login -> callback -> `/auth/me` -> pendingAccess/role landing.
4. **Frontend:** tighten real-login-mode session bootstrap and key fallback visibility on:
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
5. **QA:** queue the acceptance order as auth first, business second.

### Must not happen now
- do not reopen Sprint 1 as if it is still the main gate
- do not spend the next cycle on broad feature expansion before real auth acceptance
- do not allow silent fallback to be counted as evidence that integration succeeded

---

## 5. Document precedence

For Tech Lead / planning / alignment purposes, this file supersedes the outdated planning posture in:
- `docs/sprint1-mock-mvp-watchdog.md`
- `docs/frontend-wecom-sprint2-impact.md`
- `docs/backend-wecom-auth-gap-sprint2.md`
- `docs/tech-lead-plan.md`

Those files may still contain useful detail, but if wording conflicts with this file, **this file wins**.

---

## 6. Recommended next role to act

**Ops + Backend, jointly.**

Reason:
- the main unclosed P0 is no longer missing contract work
- it is environment-backed real WeCom acceptance
- frontend tightening should follow immediately, but only after the real auth path is runnable and observable
