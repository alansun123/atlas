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

All protected endpoints support either of:

- `Authorization: Bearer <userId>`
- `x-mock-user-id: <userId>`

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
curl http://localhost:3000/api/stores \
  -H 'Authorization: Bearer 101'
```

```bash
curl -X POST http://localhost:3000/api/schedules/batches \
  -H 'Authorization: Bearer 101' \
  -H 'Content-Type: application/json' \
  -d '{
    "storeId": 1,
    "weekStartDate": "2026-03-23",
    "weekEndDate": "2026-03-29",
    "entries": [
      {"scheduleDate": "2026-03-23", "shiftId": 11, "employeeIds": [101, 102]},
      {"scheduleDate": "2026-03-23", "shiftId": 12, "employeeIds": [202]}
    ],
    "remark": "frontend联调样例"
  }'
```
