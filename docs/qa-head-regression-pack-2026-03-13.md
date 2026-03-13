# Atlas QA head regression pack — 2026-03-13

Target branch: `techlead/watchdog-followup-20260312`

Target HEAD: `421787f`

## Scope
Focused regression retest after backend persistence change `11eca30`, with current branch head verification to ensure the preserved mock/auth baseline still holds and no fresh evidence reopens previously closed approval-detail / RBAC / state-machine scope.

## PASS items

### 1) Backend startup is healthy
Executed from `atlas-server/`:

```bash
PORT=3107 npm start
curl http://127.0.0.1:3107/health
curl http://127.0.0.1:3107/
```

Observed:
- `/health` returned `200` with the expected success envelope containing `data.status="ok"` and `data.service="atlas-server"`
- `/` returned the expected Atlas mock API metadata and route list

Assessment: PASS.

### 2) Persistence smoke still passes
Executed:

```bash
npm run test:persistence
```

Observed:
- smoke completed successfully
- the smoke test coverage still asserts restart-style persisted mock user id sequencing (`mock_206` then `mock_207`)

Assessment: PASS.

### 3) Auth smoke still passes
Executed:

```bash
npm run test:auth
```

Observed:
- auth smoke passed in stub mode and real-mode probe stub coverage
- request-id propagation, signed token flow, pending-access cases, malformed token rejection, redirect-override default-off behavior, and logout acknowledgement all still passed

Assessment: PASS.

### 4) Short mock regression slice for approval-detail / RBAC / state-machine still holds
Executed:

```bash
npm run test:rbac
npm run test:approval-hardening
```

Observed:
- `RBAC/state smoke passed`
- `Approval hardening smoke passed`
- this preserves the previously documented backend mock guarantees for approval-detail access control, duplicate guards, and approval state transitions

Assessment: PASS.

### 5) Frontend auth-truthfulness assumptions are not contradicted by current code/build
Executed:

```bash
cd atlas-web
npm run build
```

Observed:
- production build passed successfully
- current source still contains the expected truthfulness guardrails:
  - `AuthCallbackView.vue`: failure state renders `登录失败`
  - `PendingAccessView.vue`: explicitly says pending-access `不能当作已登录成功` and notes it does not establish a usable business session
  - `HomeView.vue`: prominent `mock / fallback` non-acceptance warning remains present

Assessment: PASS. Current HEAD does not contradict the 2026-03-13 auth-truthfulness retest baseline.

## Not rerun in this pass
- Full browser/manual end-to-end flow across all personas
- Real WeCom acceptance
- Any new frontend UI deep pass beyond build + targeted truthfulness inspection

These were intentionally not rerun because this was a smallest-sufficient regression pack and real WeCom acceptance remains environment-blocked.

## Fresh regression / blocker
- No fresh regression found in the retested backend persistence, auth, approval-detail/RBAC/state-machine, or frontend auth-truthfulness baseline.
- Existing blocker remains unchanged: real WeCom acceptance is still blocked by missing credentials / callback environment / mapped test identities.

## Conclusion
Focused retest on current HEAD found no fresh evidence to reopen approval-detail / RBAC / state-machine implementation scope.
