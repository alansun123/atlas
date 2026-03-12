# Atlas Tech Lead Source of Truth — Next execution phase

> 单一事实源（single source of truth）  
> 更新时间：2026-03-12 23:10 GMT+8  
> 维护角色：Tech Lead  
> 当前 planning baseline：repo reality as of 2026-03-12 late evening  
> 适用范围：Tech Lead / Frontend / Backend / QA / PM

## 1. Executive status

### 1.1 Already closed — do not reopen as active P0
These items are already closed on the current repo baseline and must not be restated as open delivery scope:

- **Sprint 1 mock MVP** = completed and demo-ready  
  Reference: `docs/qa-final-mock-retest-2026-03-12.md`
- **Approval-detail hardening / approval RBAC / duplicate-state guards** = retested PASS for the intended mock-MVP scope  
  Reference: `docs/qa-approval-hardening-retest-2026-03-12.md`
- **Sprint 2 backend auth contract first wave** = stub/integration PASS with executable probe support  
  References: `docs/qa-wecom-auth-watchdog-2026-03-12.md`, `docs/qa-wecom-acceptance-probe-retest-2026-03-12.md`
- **Frontend real-auth-first skeleton** = materially landed  
  Current repo reality: `LoginView.vue` is WeCom-first, `AuthCallbackView.vue` exchanges real code, and session failure handling is more explicit than before.

Planning implication:
- do **not** reopen Sprint 1 closure work
- do **not** reopen approval-detail / RBAC / state-machine work as pseudo-P0
- do **not** describe backend WeCom callback as still placeholder-only
- do **not** describe frontend auth as still just mock-first scaffolding

### 1.2 Current open work — only these items remain P0/P1
The next execution phase is now about separating **environment gating** from **executable repo work**.

#### P0 — blocked by user/env
1. **Real WeCom environment-backed acceptance**
   - missing real `WECOM_CORP_ID / WECOM_AGENT_ID / WECOM_SECRET`
   - missing confirmed redirect/callback environment
   - missing real test identities and confirmed `weworkUserId -> Atlas user` mappings
   - without these, real WeCom acceptance cannot be truthfully closed

#### P0/P1 — executable now without credentials
1. **Freeze the acceptance wording and owner handoff**
2. **Keep auth-first QA order fixed** so business-page checks do not get mistaken for auth acceptance
3. **Tighten remaining fallback/masking exposure on key frontend pages**
4. **Decide the exact verification boundary for approval-detail / RBAC / state-machine in Sprint 2**
5. **Sequence backend persistence as follow-up unless it directly blocks auth acceptance**

### 1.3 Current truth in one sentence
**Atlas is no longer blocked on Sprint 1 closure or backend auth contract shape; it is blocked on real WeCom environment-backed acceptance, while a smaller set of non-env planning and masking-risk tasks remains executable now.**

---

## 2. Frozen acceptance wording

### 2.1 Real WeCom acceptance
Sprint 2 real-auth acceptance is complete only when **all** items below are true in a real environment:

1. A real user can start from the WeCom login entry and complete callback successfully.
2. Backend callback returns the correct branch for each case:
   - active mapped user -> signed session/token
   - unmapped or inactive user -> `pendingAccess`
3. `GET /api/auth/me` reflects the same identity and role after callback and after refresh/token reuse.
4. Invalid / expired / malformed session is observable and recoverable:
   - it must not look like a successful login
   - frontend must clear bad state and send the user back to the proper entry path
5. At least the real-role coverage plan is defined as:
   - employee
   - manager
   - operation manager
   For final closure, these identities must be verified in the real environment once credentials are available.
6. Callback domain, app config, and redirect URI are confirmed compatible with the actual WeCom tenant.
7. At least one real acceptance run is recorded using the evidence contract in `docs/backend-wecom-real-auth-acceptance.md`.

### 2.2 Frontend masking-risk acceptance
Frontend is acceptable for Sprint 2 real-login mode only when **all** items below are true:

1. Real-login mode does **not** silently preserve an invalid session.
2. Real-login mode does **not** silently hide backend/auth failure on these key paths:
   - approvals list
   - approval detail
   - manager schedule
   - employee schedule
3. If fallback remains temporarily, the UI clearly tells QA/user that fallback/mock data is being shown.
4. Home/dashboard mock content, if still present, is explicitly marked as **non-acceptance evidence**.
5. QA can distinguish without interpretation:
   - real API success
   - auth/session failure
   - fallback/mock mode

### 2.3 Verification wording for approval-detail / RBAC / state-machine
This area is **closed for Sprint 1 delivery**, but there is still a narrow Sprint 2 verification rule:

- treat it as **closed implementation scope**
- treat it as **required regression coverage** whenever auth identity source changes
- do **not** relabel it as a fresh P0 bug unless a new failing retest appears

Current known truth:
- approval-detail RBAC and duplicate/state guards were retested PASS in `docs/qa-approval-hardening-retest-2026-03-12.md`
- the remaining gap is not “build the fix,” but “make sure real-auth identity does not invalidate already-passing access rules”

That means the correct wording is:
- **no known open approval-detail bug is blocking the repo today**
- **remaining work is auth-coupled regression verification, not reimplementation**

### 2.4 Stale wording that must not be reused
These descriptions are now incorrect:

- “Sprint 1 still needs final mock closure.”
- “Approval-detail / RBAC / state-machine hardening is still open P0.”
- “Backend WeCom callback is still placeholder-only.”
- “Frontend auth is still just mock-first callback scaffolding.”
- “Broad persistence work should happen before real auth acceptance is evidenced.”

---

## 3. Explicit separation: blocked vs executable now

### 3.1 Blocked by user/env
These cannot be completed truthfully without external input:

1. Real WeCom login against an actual tenant/app
2. Real callback round-trip on the intended domain/environment
3. Real mapped-role validation for employee / manager / operation manager
4. Real `pendingAccess` validation using an unmapped or inactive identity
5. Final evidence bundle from `npm run probe:wecom-acceptance` using real callback codes

### 3.2 Executable now without credentials
These can and should proceed immediately:

1. **Tech Lead**
   - freeze this source-of-truth document
   - keep all planning docs aligned to this wording
   - prevent closed Sprint 1 work from being reopened as fake urgency
2. **Frontend**
   - finish any remaining explicit fallback/error surfacing on the four key pages
   - ensure mock/home fallback is visibly non-acceptance
   - avoid silent success appearance on auth/API failure
3. **Backend**
   - preserve the auth contract boundary already landed
   - support the acceptance evidence flow and keep probe usage/documentation stable
   - continue persistence Phase 1 only in a way that does not redefine auth acceptance or break `req.user` compatibility
4. **QA**
   - prepare the exact auth-first retest order and evidence checklist
   - preserve the distinction between regression coverage and real-env acceptance

---

## 4. Owner handoff by role

### Tech Lead
Owns:
- this source-of-truth planning document
- acceptance wording
- sequencing discipline
- handoff boundaries between Frontend / Backend / QA
- preventing already-closed work from being reopened as active P0

Next deliverables:
1. keep this file authoritative
2. align watchdog/status summary to this file
3. explicitly call out what is blocked vs executable now

### Frontend
Owns:
- making real-login-mode state truthful
- removing or surfacing silent fallback on key business pages
- ensuring session/auth failure is visible and recoverable
- keeping homepage/demo mock output visibly separate from acceptance evidence

Must **not** own:
- redefining backend auth acceptance
- claiming auth success based on fallback-visible pages

### Backend
Owns:
- real WeCom auth execution once env exists
- callback evidence
- `/api/auth/me` continuity
- deterministic invalid-session / logout behavior
- stable user-mapping contract into existing `req.user`-based RBAC
- persistence Phase 1 only insofar as it does not confuse the auth acceptance gate

Must **not** own:
- hiding environment incompleteness behind stub success
- expanding scope before real auth acceptance is evidenced

### QA
Owns:
- auth-first retest order
- explicit verdict on real auth acceptance
- explicit regression verification that auth source changes did not break:
  - approval detail access
  - approval list visibility
  - manager/employee route permissions
  - core state-machine protections already closed in Sprint 1

Must **not** own:
- treating mock/fallback pages as proof of real integration
- compensating for ambiguous UI states by assumption

---

## 5. Next-step sequencing

### Sequence A — do now, no credentials required
1. **Tech Lead:** freeze planning wording in this doc and aligned status docs.
2. **Frontend:** close remaining masking-risk gaps on the four key pages, or make fallback state unmistakably explicit.
3. **QA:** prepare the exact auth-first retest checklist, including regression checks for approval detail / RBAC / state-machine after auth source changes.
4. **Backend:** continue persistence Phase 1 only if it stays behind the auth contract boundary and does not create a second competing acceptance track.

Exit condition for Sequence A:
- the team has one planning truth, one QA order, and no ambiguity about what still depends on credentials

### Sequence B — start immediately once credentials/env are available
1. **Backend + env owner:** confirm redirect URI, callback domain, and real secrets.
2. **Backend:** run `npm run check:wecom-env`.
3. **Backend:** run `npm run probe:wecom-acceptance` with real callback codes.
4. **QA:** verify success path, `pendingAccess`, `/api/auth/me` continuity, and invalid-session handling.
5. **QA:** run focused regression checks for approval detail / route RBAC / state-machine protections under real-auth identities.
6. **Tech Lead:** issue acceptance verdict: accepted / blocked / partial, with evidence.

Exit condition for Sequence B:
- one truthful real-env acceptance verdict exists, with evidence

---

## 6. Specific unfinished items that need clean wording

### 6.1 Approval detail / RBAC / state-machine gap
Correct wording:
- **implementation gap: closed**
- **verification gap after auth-source switch: still required**

What still must be checked when real auth is available:
1. a real manager mapped to the submitter/store can still open approval detail correctly
2. a real operation manager/current approver can still open and act correctly
3. an unrelated employee remains rejected
4. duplicate-approve / invalid-state transitions remain blocked after identity is populated from real auth instead of mock login

This is a QA/regression item, not a reopen-the-feature item.

### 6.2 Mock/regression retest expectations
Frozen expectation for the next cycle:
- **do not rerun Sprint 1 closure as if it were still undecided**
- **do preserve a short regression pack** that proves previously-passing mock protections still hold after surrounding auth/persistence changes

Minimum regression pack:
1. backend starts cleanly
2. core auth smoke still passes in current supported mode
3. approval-detail access rules still match the preserved QA artifact
4. core schedule approval state transitions still reject obvious invalid transitions
5. frontend still does not silently claim success when auth/session fails

### 6.3 WeCom integration acceptance planning
The real acceptance run must be treated as a **single evidence-backed event**, not as loose ad hoc spot checks.

Required plan:
1. define the exact target environment
2. define the three mapped identities plus one pending-access identity
3. run env readiness check
4. run probe with real codes
5. capture backend evidence
6. run QA auth-first verification in the same environment
7. only then call any broader business-page behavior “real-login-mode verified”

---

## 7. Planning directives

### Do now
- use this file as the authoritative Tech Lead planning artifact
- keep `docs/watchdog-status-next-steps-2026-03-12.md` aligned as a shorter status mirror
- assign Frontend + QA work that does **not** require credentials
- keep Backend persistence work explicitly secondary to auth acceptance truth

### Do not do now
- do not reopen Sprint 1 closure work
- do not reopen approval-detail / RBAC / state-machine as feature implementation scope
- do not treat fallback-visible pages as acceptance evidence
- do not let persistence become a second ambiguous P0 before real auth is evidenced

---

## 8. Document precedence
For Tech Lead planning/alignment, this file supersedes stale or narrower wording in:
- `docs/tech-lead-plan.md`
- `docs/watchdog-status-next-steps-2026-03-12.md`
- `docs/sprint1-mock-mvp-watchdog.md`
- `docs/backend-wecom-auth-gap-sprint2.md`
- `docs/frontend-wecom-sprint2-impact.md`

If wording conflicts, **this file wins**.

---

## 9. Immediate handoff summary

### Biggest unblocker
- **real WeCom credentials + callback environment**

### Highest-value executable work before credentials arrive
- **Frontend:** make fallback/error state unmistakable on approval/schedule paths
- **QA:** prepare auth-first retest + regression pack for approval-detail / RBAC / state-machine under real-auth identities
- **Backend:** keep persistence Phase 1 isolated from auth acceptance gate
- **Tech Lead:** keep every planning/status doc aligned to this exact execution order
