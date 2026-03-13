# Backend persistence smoke — 2026-03-13

## Scope
- Backend-only persistence Phase 1 hardening
- No frontend/UI changes
- No change to WeCom real-auth acceptance gate

## What changed
- `atlas-server/src/data/db.js`
  - Added `ATLAS_DB_PATH` override so backend smoke tests can run against an isolated SQLite file.
  - Added `closeDb()` test helper.
  - Added `getNextMockWeworkUserId()` so newly created users derive `mock_<n>` from persisted SQLite state instead of volatile in-memory counters.
- `atlas-server/src/modules/employees/index.js`
  - Employee creation no longer increments the in-memory `db.counters.employeeId`; it relies on persistence-backed ID generation.
- `atlas-server/test-persistence-smoke.js`
  - Added a restart-style smoke test proving a created employee gets `mock_206`, process/module reload occurs, and the next created employee gets `mock_207` from the same SQLite file without unique-key collision.

## Validation
Executed in `atlas-server/`:

```bash
npm run test:persistence && npm run test:auth
```

Result: passed.

## Handoff note
This stays behind the current auth contract boundary. It hardens local persistence behavior for employee creation and testability, but does not claim or redefine real WeCom acceptance.
