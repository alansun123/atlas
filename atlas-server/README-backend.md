# Atlas Backend Mock API

Express-based mock backend for Atlas frontend integration.

## Start

```bash
npm install
npm run dev
# or
npm start
```

Default port:

```bash
PORT=3000
```

## Auth

Protected endpoints now use signed bearer tokens issued by the backend.

### Supported login paths

- `POST /api/auth/wework/callback` — real-auth-first entry; resolves a WeCom identity via env-gated adapter/stub and returns either:
  - a signed session token for an active mapped Atlas user, or
  - `pendingAccess: true` for unmapped / inactive / unusable users
- `POST /api/auth/mock-login` — explicit dev/demo fallback only

### Dev env knobs

```bash
ATLAS_AUTH_TOKEN_SECRET=atlas-dev-secret-change-me
ATLAS_AUTH_TOKEN_TTL_SECONDS=7200
ATLAS_WECOM_AUTH_MODE=stub
ATLAS_WECOM_CODE_MAP='{"demo-manager":{"weworkUserId":"manager_zhangsan","name":"张三"}}'
```

The WeCom callback stub also accepts `stub:<weworkUserId>` style codes in `stub` mode.

Mock users currently available:

- `101` 张三（manager）
- `102` 李四（employee）
- `201` 王经理（operation_manager）
- `202` 王五（employee）
- `203` 赵六（manager）
- `204` 孙七（employee）

## Response shape

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "trace_xxx",
  "timestamp": 1773280000000
}
```

Non-zero `code` means business failure.

## Priority mock endpoints

### Auth
- `POST /api/auth/mock-login`
- `POST /api/auth/wework/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Stores / Employees
- `GET /api/stores`
- `GET /api/stores/:id/shifts`
- `GET /api/employees`

### Schedules
- `POST /api/schedules/batches`
- `GET /api/schedules/batches/:id`
- `POST /api/schedules/batches/:id/validate`
- `POST /api/schedules/batches/:id/submit-approval`
- `POST /api/schedules/batches/:id/publish`
- `GET /api/schedules/me`

### Approvals
- `GET /api/approvals/pending`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

## Quick curl examples

```bash
curl -X POST http://localhost:3000/api/auth/mock-login \
  -H 'Content-Type: application/json' \
  -d '{"userId":101}'
```

```bash
curl -X POST http://localhost:3000/api/auth/wework/callback \
  -H 'Content-Type: application/json' \
  -d '{"code":"stub:manager_zhangsan"}'
```

```bash
curl http://localhost:3000/api/stores \
  -H 'Authorization: Bearer <signed-token>'
```
