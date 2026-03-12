# Atlas final mock retest — 2026-03-12

## Verdict

**Demo-ready now for Sprint 1 mock MVP.**

Current codebase passes the backend startup/build/RBAC/state-flow retest required by `SPRINT1.md`, and frontend production build passes. The remaining gap is **not a Sprint 1 blocker** but should be called out clearly: the frontend still contains fallback/local-mock paths, so this retest proves the mock MVP chain primarily through real backend HTTP checks plus frontend build validation, not a full browser-only E2E.

---

## Verified in this retest

### 1) Frontend build
- `atlas-web` installs and builds successfully via `npm run build`.
- Route/view files for login, home, employee schedule, manager schedule, approval list, and approval detail are present.

### 2) Backend startup
- `atlas-server` starts successfully with `PORT=3100 npm start`.
- `GET /health` returns healthy.

### 3) Mock demo chain sanity
Verified against a live `npm start` server:

1. **Manager mock login** works (`userId=101`).
2. **Employee mock login** works (`userId=102`).
3. **Ops manager mock login** works (`userId=201`).
4. Manager can view batch detail for `batchId=10001`.
5. Manager can validate batch `10001` and gets warning/issues requiring approval.
6. Manager can submit approval for `10001` and receives `approvalId=90002`.
7. Ops manager can see the approval in pending list.
8. Ops manager can open approval detail `90002`.
9. Ops manager can approve `90002`; batch moves to `approved`.
10. Manager can publish batch `10001`; batch moves to `published`.
11. Employee `102` can read `/api/schedules/me` and sees the published shift entry from batch `10001`.

### 4) Approval detail behavior
- `GET /api/approvals/:id` returns structured approval detail before approval.
- After approval, the same endpoint reflects updated fields correctly:
  - `status=approved`
  - `approvedAt` present
  - `comment` updated
  - nested `scheduleBatch.status=approved`

### 5) RBAC rejection checks
Confirmed fixed on current code:
- Employee create batch -> **403**
- Employee publish batch -> **403**
- Manager approve approval -> **403**

### 6) State-machine / guard checks
Confirmed on current code:
- Duplicate submit while already `pending_approval` -> returns same approval (`reused=true`), no duplicate pending approval created.
- Duplicate approve after already approved -> **400** (`当前审批单不可审批`).
- Publish directly from draft batch that requires approval -> **400** (`当前批次需审批后才能发布`).
- Publish while `pending_approval` -> **409** (`审批中的批次不能直接发布`).
- Duplicate publish after already published -> idempotent **200** with `alreadyPublished=true`.

---

## Not fully verified

These were **not** fully closed in a browser-driven end-to-end pass:

1. Full click-path browser E2E across employee/store-manager/ops-manager personas in one UI session.
2. Whether every frontend action now uses real backend data first in all screens; source inspection still shows fallback/local-mock paths in `atlas-web/src/api/atlas.ts` and `atlas-web/src/api/mock.ts`.
3. Final visual/interaction stability of the approval detail page in browser (API behavior is verified; UI rendering was not re-driven end-to-end in this retest).

---

## Blockers

**No P0 blocker found for Sprint 1 mock MVP acceptance.**

### Non-blocking follow-up to hand off
Frontend still appears to be a **hybrid real-API + fallback mock** implementation rather than a pure live-data flow. That is acceptable for the current Sprint 1 mock-demo gate if the team is aligned on the demo mode, but frontend should eventually remove/limit fallback paths to avoid masking integration regressions.

---

## Key evidence

### Live-server retest highlights
- `approvalId` used: **90002**
- published employee-visible batch: **10001**
- publish-guard test batch: **10003**

### Expected/actual outcomes confirmed
- approval detail before approve: **PASS**
- approval detail after approve refresh semantics: **PASS**
- employee create/publish forbidden: **PASS**
- manager approval misuse forbidden: **PASS**
- approval bypass publish blocked: **PASS**
- pending publish blocked: **PASS**
- duplicate approve blocked: **PASS**
- duplicate publish idempotent: **PASS**

---

## Commands run

```bash
cd /Users/xiaomax/.openclaw/workspace/projects/atlas
find . -maxdepth 3 \( -name package.json -o -name README.md -o -name '*QA*' -o -name '*qa*' -o -name '*smoke*' -o -name 'playwright.config.*' -o -name 'vite.config.*' -o -name '.env.example' \) | sort

cd atlas-web && npm run build

cd atlas-server && node test-rbac-smoke.js

cd atlas-server && PORT=3100 npm start

node - <<'NODE'
const base='http://127.0.0.1:3100';
async function req(path,{method='GET',token,body}={}){
  const res=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  let json; try{json=await res.json();}catch{json=null}
  return {status:res.status,json};
}
(async()=>{
  const submit = await req('/api/schedules/batches/10001/submit-approval',{method:'POST',token:101,body:{triggerReasons:['UNDER_MIN_STAFF','NEW_EMPLOYEE_FIRST_WEEK'],comment:'QA final retest'}});
  const approvalId = submit.json?.data?.approvalId;
  console.log(JSON.stringify({
    health: await req('/health'),
    managerLogin: await req('/api/auth/mock/login',{method:'POST',body:{userId:101}}),
    employeeLogin: await req('/api/auth/mock/login',{method:'POST',body:{userId:102}}),
    opsLogin: await req('/api/auth/mock/login',{method:'POST',body:{userId:201}}),
    batchDetail: await req('/api/schedules/batches/10001',{token:101}),
    validate: await req('/api/schedules/batches/10001/validate',{method:'POST',token:101}),
    submit,
    pending: await req('/api/approvals/pending',{token:201}),
    detailBefore: await req(`/api/approvals/${approvalId}`,{token:201}),
    employeeCreateForbidden: await req('/api/schedules/batches',{method:'POST',token:102,body:{storeId:1,weekStartDate:'2026-04-06',weekEndDate:'2026-04-12',entries:[]}}),
    employeePublishForbidden: await req('/api/schedules/batches/10001/publish',{method:'POST',token:102,body:{notifyEmployees:false}}),
    managerApproveForbidden: await req(`/api/approvals/${approvalId}/approve`,{method:'POST',token:101,body:{comment:'role bypass attempt'}}),
    duplicateSubmit: await req('/api/schedules/batches/10001/submit-approval',{method:'POST',token:101,body:{triggerReasons:['UNDER_MIN_STAFF'],comment:'duplicate submit'}}),
    approve: await req(`/api/approvals/${approvalId}/approve`,{method:'POST',token:201,body:{comment:'approved in final retest'}}),
    duplicateApprove: await req(`/api/approvals/${approvalId}/approve`,{method:'POST',token:201,body:{comment:'approve again'}}),
    detailAfter: await req(`/api/approvals/${approvalId}`,{token:201}),
    publish: await req('/api/schedules/batches/10001/publish',{method:'POST',token:101,body:{notifyEmployees:false}}),
    duplicatePublish: await req('/api/schedules/batches/10001/publish',{method:'POST',token:101,body:{notifyEmployees:false}}),
    employeeMe: await req('/api/schedules/me',{token:102})
  },null,2));
})();
NODE

node - <<'NODE'
const base='http://127.0.0.1:3100';
async function req(path,{method='GET',token,body}={}){
  const res=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  let json; try{json=await res.json();}catch{json=null}
  return {status:res.status,json};
}
(async()=>{
  const create = await req('/api/schedules/batches',{method:'POST',token:101,body:{storeId:1,weekStartDate:'2026-04-06',weekEndDate:'2026-04-12',entries:[{scheduleDate:'2026-04-06',shiftId:11,employeeId:102,remark:'qa pending publish guard'}],remark:'qa publish guard'}});
  const batchId = create.json?.data?.id;
  console.log(JSON.stringify({
    create,
    validate: await req(`/api/schedules/batches/${batchId}/validate`,{method:'POST',token:101}),
    publishDirect: await req(`/api/schedules/batches/${batchId}/publish`,{method:'POST',token:101,body:{notifyEmployees:false}}),
    submit: await req(`/api/schedules/batches/${batchId}/submit-approval`,{method:'POST',token:101,body:{triggerReasons:['UNDER_MIN_STAFF'],comment:'qa pending guard'}}),
    publishPending: await req(`/api/schedules/batches/${batchId}/publish`,{method:'POST',token:101,body:{notifyEmployees:false}})
  },null,2));
})();
NODE
```
