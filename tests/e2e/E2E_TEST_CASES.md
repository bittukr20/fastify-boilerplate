# E2E Test Cases

End-to-end tests that run against a **real PostgreSQL database** with seeded test data.
Each test file boots the real app in-process (Fastify `inject`), seeds the data, runs its tests,
and tears the data down again.

**Run:** `npm run migrate:test`, then `npm run test:e2e` (needs an existing PostgreSQL database named `test`). See the README for details.

Files run one after another because they share one database. Every test uses unique names, so tests
inside a file never clash with each other.

---

## Health (`tests/e2e/health/health.e2e.test.js`)

| Test | What it checks | Expected |
| --- | --- | --- |
| `reports that the service is up` | `GET /health` | 200 `{ "statusCode": 200, "status": "ok" }` |

## Users (`tests/e2e/users/users.e2e.test.js`)

Seed (`tests/testdata/seed.sql`): one existing user, `Seeded User Existing`
(`a0000001-0000-0000-0000-000000000001`).

| Test | What it checks | Expected |
| --- | --- | --- |
| `creates a user and stores it in the database` | `POST /v1/users` with a valid body, then reads the row back | 201 with a `user_id`. The row holds the same `full_name` and `phone_number` |
| `returns 400 listing every missing or invalid field` | Body with a too short `full_name` and no `phone_number` | 400, errors match `__mocks__/create_user_validation_error.response.mock.json` (array order ignored) |
| `returns 409 when a user with the same full_name already exists` | Creates a user with the seeded name | 409 `UNIQUE_KEY_VIOLATION`, matches `__mocks__/create_user_duplicate_name.response.mock.json` |
| `does not store anything when the request is rejected` | Valid body plus an unknown field | 400, and no row is written |

---

## Adding a test case

1. Add the seed rows to `tests/testdata/seed.sql` (fixed ids), or create `<feature>_seed.sql` and
   `<feature>_teardown.sql` and pass them to `initServer({ seedFileName, teardownFileName })`.
2. Add the matching deletes to the teardown file (child tables first, explicit ids or a name prefix).
3. Create `tests/e2e/<feature>/<feature>.e2e.test.js` and copy the `beforeAll` / `afterAll` lines from an existing file.
4. Put expected error and list responses in `tests/e2e/<feature>/__mocks__/<scenario>.response.mock.json`.
5. Add a row to this file.
