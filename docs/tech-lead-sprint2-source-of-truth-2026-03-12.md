# Atlas Tech Lead Source of Truth — Sprint 2 acceptance, sequencing, and ownership

> 单一事实源（single source of truth）  
> 更新时间：2026-03-12  
> 维护角色：Tech Lead  
> 当前基线：`fc87dd5` on `main`  
> 适用范围：Tech Lead / PM / Backend / Frontend / QA / Ops

## 1. Executive status

### 1.1 Closed / no longer P0
The following items are **done** on the current baseline and must **not** be tracked as open P0 work anymore:

- **Sprint 1 mock MVP** = completed, demo-ready  
  Reference: `docs/qa-final-mock-retest-2026-03-12.md`
- **Approval-detail hardening / approval RBAC / duplicate-state guards** = completed for the intended mock-MVP scope  
  Reference: `docs/qa-approval-hardening-retest-2026-03-12.md`, backend hardening in `de1049b`, frontend approval-detail hardening in `fc87dd5`
- **Frontend login/callback/session polish for real-auth-first skeleton** = materially advanced and no longer the primary planning gap  
  Current reality: login path is real-auth-first, callback exchanges code, session failure paths are more explicit than before

Planning implication:
- do **not** reopen Sprint 1 as if it still needs final closure work
- do **not** keep assigning approval-detail / RBAC / state-machine fixes as pseudo-P0
- do **not** describe frontend auth as still being only a mock-first shell

### 1.2 The real remaining P0
Current Sprint 2 P0 is now limited to **unfinished** work only:

1. **real WeCom integration acceptance in a real environment**
2. **tightening frontend fallback risk so real-login failures cannot be masked**

This is the planning truth after the latest repo state:
- backend auth contract is already at **stub/integration PASS**
- approval workflow hardening is already landed
- frontend approval/session failure handling is already improved
- the remaining gap is **environment-backed acceptance + removal/exposure of masking behavior**

References:
- `docs/qa-wecom-auth-watchdog-2026-03-12.md`
- `docs/qa-approval-hardening-retest-2026-03-12.md`
- `docs/qa-final-mock-retest-2026-03-12.md`

---

## 2. Frozen acceptance wording

### 2.1 Real WeCom acceptance
Sprint 2 auth is only accepted when **all** items below are true in a real environment:

1. A real user can start from the WeCom login entry and complete callback successfully.
2. Backend callback returns the correct branch for each case:
   - active mapped user -> signed session/token
   - unmapped or inactive user -> `pendingAccess`
3. `GET /api/auth/me` reflects the same identity and role after callback and after page refresh.
4. Invalid / expired session is observable and recoverable:
   - it must not look like a successful login
   - frontend must clear bad session state and return the user to the correct entry path
5. At least three real mapped identities are verified end-to-end once:
   - employee
   - manager
   - operation manager
6. The callback environment, app config, and redirect domain are all confirmed compatible with the actual WeCom tenant.

### 2.2 Fallback-risk acceptance
Frontend is only acceptable for Sprint 2 real-login mode when **all** items below are true:

1. Real-login mode does **not** silently preserve an invalid session.
2. Real-login mode does **not** silently hide backend/auth failure on these key paths:
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
3. If fallback remains temporarily, the UI must explicitly tell QA/user that fallback/mock data is being shown.
4. Home/dashboard mock content, if still present, is explicitly marked as **non-acceptance evidence**.
5. QA can distinguish these states without interpretation:
   - real API success
   - auth/session failure
   - fallback/mock mode

### 2.3 Stale wording that must not be reused
These descriptions are now incorrect and should be treated as obsolete:

- “Sprint 1 still needs final mock closure.”
- “Approval-detail / RBAC / state-machine hardening is still open P0.”
- “Backend WeCom callback is still placeholder-only.”
- “Frontend auth is still just mock-first callback scaffolding.”
- “Next priority is broad feature expansion before real auth acceptance.”

---

## 3. Unfinished work, in the only valid order

### Phase 1 — Ops + Backend: make real WeCom acceptance executable
**Goal:** create an environment where the current auth contract can actually be accepted or rejected.

Required outputs:
- real `WECOM_CORP_ID / AGENT_ID / SECRET` (or exact chosen real-mode env contract)
- reachable callback domain/environment
- confirmed redirect URI alignment with WeCom app config
- three real test identities with known Atlas role ownership:
  - employee
  - manager
  - operation manager
- confirmed `weworkUserId -> Atlas user` mapping for each identity

Exit condition:
- the team can run one real login -> callback -> `/auth/me` acceptance pass without inventing missing environment pieces mid-flight

### Phase 2 — Backend: execute and evidence the real auth run
**Goal:** prove the auth contract works beyond stub/integration.

Required checks:
1. login URL generation is valid in real mode
2. callback succeeds for mapped active user
3. callback returns `pendingAccess` for unmapped/inactive user
4. signed session/token survives refresh through `/api/auth/me`
5. logout / invalid-session branch behaves deterministically

Exit condition:
- one documented real acceptance run exists with evidence for success path and `pendingAccess` path

### Phase 3 — Frontend: tighten masking behavior after real auth path is runnable
**Goal:** stop hybrid fallback from disguising failed integration as usable product behavior.

Priority order:
1. keep `/login`, `/auth/callback`, and session bootstrap on real-auth-first path
2. remove or clearly surface silent fallback on:
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
3. ensure session/auth failure states are visible and recoverable
4. keep homepage mock summaries separated from acceptance logic

Exit condition:
- failed auth/API state is visible as failed, not falsely usable

### Phase 4 — QA: verify identity chain first, business chain second
**Goal:** prevent business-page checks from being mistaken for auth acceptance.

Required test order:
1. real login success path
2. `pendingAccess` path
3. refresh/session continuity via `/api/auth/me`
4. invalid/expired session handling
5. only then business-page validation in real-login mode

Exit condition:
- QA can answer two separate questions clearly:
  - is real WeCom auth accepted?
  - does fallback still mask defects on key pages?

### Phase 5 — Backend follow-up: durable user source after auth acceptance
**Goal:** improve persistence only after the environment + auth truth is established.

Possible scope:
- move local user/store/staff source away from mock/in-memory as needed
- keep `req.user` contract stable for schedule/approval downstream modules
- treat persistence migration as post-auth-acceptance unless it directly blocks acceptance

Exit condition:
- persistence work is sequenced as follow-up, not confused with immediate P0

---

## 4. Role ownership

### Tech Lead
Owns:
- this planning document
- acceptance wording
- sequencing discipline
- preventing closed Sprint 1 work from being reopened as fake urgency

Does not own:
- manual environment provisioning
- implementing business-page fallback refactors
- redefining already-landed approval hardening as active delivery scope

### PM
Owns:
- aligning team on the phase order
- ensuring real-environment dependencies are acknowledged as gating inputs
- preventing scope creep before auth acceptance

Does not own:
- inventing alternate acceptance wording per role/team

### Ops
Owns:
- callback environment/domain readiness
- WeCom app configuration readiness
- secret/config availability in the target environment

Does not own:
- frontend fallback UX decisions
- approval-flow business logic changes

### Backend
Owns:
- real WeCom auth execution
- callback evidence
- `/api/auth/me` continuity
- user mapping validation
- deterministic auth/logout/session behavior

Does not own:
- hiding environment incompleteness behind stub success
- broad domain refactors before auth acceptance is proven

### Frontend
Owns:
- making real-login-mode state truthful
- removing or surfacing silent fallback on key pages
- keeping session failure handling explicit

Does not own:
- redefining backend auth contract
- using fallback to claim acceptance evidence

### QA
Owns:
- auth-first validation order
- explicit verdict on real auth acceptance
- explicit verdict on whether fallback still masks defects

Does not own:
- compensating for unclear UI states by assumption
- turning mock-visible pages into evidence of real integration success

---

## 5. Planning directives

### Do now
1. **Use this file as the authoritative Tech Lead planning artifact.**
2. **Assign Ops + Backend immediately** to prepare the real WeCom acceptance environment.
3. **Run one evidenced real auth acceptance pass** before any broader Sprint 2 expansion.
4. **Then assign Frontend** to tighten or expose fallback on the four key paths.
5. **Then run QA auth-first retest** in the same order defined above.

### Do not do now
- do not reopen Sprint 1 closure work
- do not reopen approval-detail / RBAC / state-machine hardening as P0
- do not treat homepage/demo mock output as proof of real integration
- do not spend the next cycle on broad feature expansion before real auth acceptance is evidenced

---

## 6. Document precedence

For Tech Lead / planning / alignment purposes, this file supersedes stale planning posture in:
- `docs/sprint1-mock-mvp-watchdog.md`
- `docs/backend-wecom-auth-gap-sprint2.md`
- `docs/frontend-wecom-sprint2-impact.md`
- `docs/tech-lead-plan.md`
- `docs/watchdog-status-next-steps-2026-03-12.md`

Those files may still contain useful detail, but if wording conflicts with this file, **this file wins**.

---

## 7. Next role-appropriate step

**Ops + Backend, jointly.**

Why:
- the main open P0 is no longer missing Sprint 1 closure or approval hardening
- the main open P0 is environment-backed real WeCom acceptance
- frontend fallback tightening should happen immediately after the auth path is runnable and evidenced, not before that planning truth is established
