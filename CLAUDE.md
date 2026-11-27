# CLAUDE.md

Guidance for Claude Code (and for humans) when working in this repository.

This repo is a **Fastify + Knex + PostgreSQL service boilerplate** and the reference project for a
series of posts and videos. The goal of this file: when you ask Claude to add a feature, the code it
writes should look like it was written by the same person who wrote the rest of the repo.

Stack: Node.js >= 20, Fastify 5, Knex + PostgreSQL, Jest, ESLint (airbnb-base) + Prettier,
`moment-timezone` for dates, Google Cloud (Tasks, Pub/Sub, Storage, Datastore, Secret Manager).

---

## How to work in this repo

1. **Read before you write.** Find the closest existing example (see "Copy these examples") and
   follow its shape. Read the whole call chain before changing unfamiliar code.
2. **API first.** For a new endpoint, write the schema (the contract) before the implementation.
3. **Add only what was asked.** No extra endpoints, options or abstractions "just in case".
4. **Explain trade-offs** when you suggest a structural change, and ask before restructuring.
5. **Finish with the checks.** Run `npm run lint:fix` and `npm run test:unit`, and `npm run test:e2e` when an endpoint, schema, migration or error handling changed. Fix what they report.
6. **Never commit secrets.** No `.env`, credentials or service-account files.

## Commands

```bash
npm run start:dev                # nodemon + pretty logs (needs PostgreSQL, see .env.example)
npm run test:unit                # Jest unit tests + coverage (threshold 50%)
npm run test:e2e                 # integration tests against the existing PostgreSQL database "test" (tests/.test.env). Run `npm run migrate:test` first
npm run lint:fix                 # ESLint + Prettier with auto-fix. ALWAYS run after changes
npm run migrate                  # run pending Knex migrations
npm run migrate:test             # run pending migrations on the E2E test database (needed before test:e2e)
npm run migrate:make -- <name>   # create a new migration (timestamped file)
npm run migrate:down             # roll back the last migration
```

Git hooks (Husky): `pre-commit` runs `npm run lint`, `pre-push` runs `npm run test:unit`.

---

## The architecture in one picture

```
request
  │  hooks: extractLogTrace → requestLogging → (validation) → handler → responseLogging
  ▼
routes ──► handlers ──► services ──► repository ──► PostgreSQL
 (wire)    (translate)  (decide)     (query)
                           │
                           ├──► transformers   (reshape data, pure functions)
                           └──► plugins        (events, tasks, HTTP calls, cache, ...)
```

No layer skipping: a handler never talks to the database, a route never contains logic.

| Layer | Does | Must NOT do |
| --- | --- | --- |
| **Routes** (`routes/index.js`) | Register the route: method, url, schema, handler | Any logic |
| **Handlers** (`handlers/<endpoint>.js`) | Take values from `request`, call one service, `reply.code().send()` | Branching logic, DB access |
| **Services** (`services/<operation>.js`) | Business rules, transactions, call repos, publish events/tasks | Raw Knex, data shaping inline |
| **Repository** (`repository/*.js`) | Run Knex queries. Log each query | Business logic, data transformation |
| **Transformers** (`transformers/*.js`) | Pure functions that reshape data between API and DB | Side effects, DB, HTTP |
| **Schemas** (`schemas/<endpoint>.js`) | AJV request and response contract | Logic |
| **Pre-handlers** (`preHandlers/`) | Business-rule checks before the handler runs | Writing data |

## Folder structure

```
src/
├── index.js                     # builds the Fastify app: env, hooks, plugins, routes
└── app/
    ├── <module>/                # one folder per business module (sample: users/)
    │   ├── routes/index.js      # registers ALL endpoints of the module
    │   ├── handlers/            # 1 file per endpoint + index.js re-export
    │   ├── schemas/             # 1 file per endpoint + index.js re-export
    │   ├── services/            # 1 file per endpoint or business operation
    │   ├── repository/          # shared per entity: users.js, downstreamCalls.js
    │   ├── transformers/        # named after the domain (user.js), no "transformer" suffix
    │   ├── preHandlers/         # create when needed
    │   └── commons/             # models.js (table/column names), constants.js
    ├── plugins/                 # Fastify plugins (see README for the full list)
    ├── hooks/logging/           # trace + request/response logging
    ├── errorHandler/            # CustomError, central handler, error mappers
    ├── commons/                 # helpers.js, configs.js, constants.js, schemas/ (shared)
    └── utils/                   # DateTimeFormatter
```

Unit tests live in a `__tests__/` folder next to the code they test (`*.test.js`). Mocks live in `__mocks__/`.
Integration (E2E) tests live in `tests/e2e/<feature>/`, with seed data in `tests/testdata/` (see "Integration (E2E) tests").

---

## Copy these examples

When adding code, open the matching file first and mirror it.

| You are adding | Mirror this file |
| --- | --- |
| A route | `src/app/users/routes/index.js` |
| A handler | `src/app/users/handlers/createUsers.js` |
| A request/response schema | `src/app/users/schemas/addUser.js` |
| A service | `src/app/users/services/createUsers.js` |
| A repository function | `src/app/users/repository/users.js` |
| A transformer | `src/app/users/transformers/user.js` |
| A call to another service | `src/app/users/repository/downstreamCalls.js` |
| Table/column constants | `src/app/users/commons/models.js` |
| A service unit test | `src/app/users/services/__tests__/createUsers.test.js` |
| A repository unit test | `src/app/users/repository/__tests__/users.test.js` |
| An HTTP-level handler test | `src/app/users/handlers/__tests__/createUsers.test.js` |
| An integration (E2E) test file | `tests/e2e/users/users.e2e.test.js` |
| A golden response file | `tests/e2e/users/__mocks__/create_user_duplicate_name.response.mock.json` |
| E2E seed and teardown data | `tests/testdata/seed.sql` and `tests/testdata/teardown.sql` |
| E2E helpers | `tests/e2e/testutil/testutil.js` |
| A migration | `migrations/20211120172347_create_table_user.js` |
| A plugin | any folder in `src/app/plugins/` (e.g. `cloudTask/` with its test) |

---

## Coding standards

### The rules that matter most
- **`const` always. Never `let`.** The only exception is an indexed `for` loop counter.
- **Every function takes ONE destructured object argument**, never positional parameters:
  `getOrderById({ orderId, logTrace })`, not `getOrderById(orderId, logTrace)`.
  Framework-mandated signatures are the only exception: handlers `(request, reply)`,
  hooks, pre-handlers `(request)`, and plugins `async fastify => ...`.
- **Small, single-purpose functions.** Extract a named function for any distinct step. Never inline a
  self-contained loop or conditional inside a service function.
- **Complexity <= 5, nesting depth <= 2.** Use early returns to flatten logic.
- **Verb-prefixed names:** `getOrderById`, `buildInsertInput`, `checkIsValidAddress`.
- **Meaningful variable names.** Say what the variable holds. Never `res`, `tmp`, `arr`, `obj`, `jr`.
  Good: `userAddresses`, `userIdToAddressesMap`.
- **No duplication.** Repeated logic moves into a helper.
- **Write for a junior reader.** Prefer explicit code over clever one-liners.
- **No raw string discriminators.** Values such as `"FIXED"` or `"USER_CREATED"` go in a
  `commons/constants.js` and are referenced everywhere (services, schemas, handlers).

### Naming
| What | Style | Example |
| --- | --- | --- |
| JS variables and functions | camelCase | `logTrace`, `createUser` |
| DB tables and columns | snake_case | `full_name`, `created_at` |
| API request and response fields | **snake_case** | `user_id`, `phone_number` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIME_ZONE` |

If an API field name differs from the internal naming, rename while destructuring:
`const { current_time_stamp: currentTimeStamp } = body;`

### ESLint gotchas (airbnb-base)
`for...of` is banned. For sequential async work use an indexed loop:

```javascript
for (let i = 0; i < items.length; i += 1) {
  const item = items[i];
  // eslint-disable-next-line no-await-in-loop
  await doSomething({ item });
}
```

---

## Layer patterns (with the real code)

### Route: wiring only
```javascript
module.exports = async fastify => {
  fastify.route({
    method: "POST",
    url: "/users",
    schema: schemas.postAddUser,
    handler: handlers.createUser(fastify)
  });
};
```
One handler instance per route, created once at startup. Never build per-entity handlers in a loop.

### Handler: thin
```javascript
function createUserHandler(fastify) {
  const createUser = createUserService(fastify);
  return async (request, reply) => {
    const { body, logTrace } = request;
    const response = await createUser({ body, logTrace });
    return reply.code(201).send(response);
  };
}
```

### Service: decide, orchestrate
```javascript
function createUsersService(fastify) {
  const { createUser } = userRepo(fastify);

  return async ({ body, logTrace }) => {
    const row = toUserInsertRow({ body });
    const user = await createUser.call(fastify.knex, { row, logTrace });
    return toUserResponse({ user });
  };
}
```
- A service is a factory `(fastify) => async ({ ... }) => ...`.
- Config such as entity settings is looked up inside the service, never pushed in from routes.
- Transform data first (transformers), then call the repository.

### Repository: queries only
```javascript
function userRepo(fastify) {
  async function createUser({ row, logTrace }) {
    const knex = this;                       // the knex instance, bound by the caller
    const query = knex(USER.NAME).returning("*").insert(row);
    logQuery({ logger: fastify.log, query, context: "Create User", logTrace });
    const response = await query;
    return response[0];
  }
  return { createUser };
}
```
- Repos export a **factory**. Functions get knex through `this`; callers use `.call(fastify.knex, {...})`.
- Repos receive **ready-to-use data**: `{ row }` for one row, `{ rows }` for many, `{ fields }` for updates.
  No column mapping, JSON serialisation or timestamp generation inside a repo. That belongs in a transformer.
- Log every query with `logQuery` (it logs at debug level and includes `logTrace`).
- Use constants from `commons/models.js`. Never hardcode table or column names.

### Transformer: pure data shaping
```javascript
function toUserInsertRow({ body }) {
  const { full_name, phone_number } = body;
  return { full_name, phone_number };
}
```
Called from services only. Named after the domain (`user.js`), not `userTransformer.js`.

---

## Database

- Only repositories touch Knex. Services never call `knex` directly.
- Use the query builder. Raw SQL only for aggregations and subqueries; write multi-line raw SQL
  as template literals and pull shared `WHERE` clauses into named variables.
- **No database calls inside loops.** Collect ids, use `.whereIn()`, map the results in memory.
- Many rows: `knex.batchInsert(table, rows, chunkSize)` or one multi-row insert. Never loop single inserts.
- Upserts: `.insert(rows).onConflict([...]).merge()`.
- One `UPDATE` per row per operation: combine all changed columns. Atomic counters use
  `knex.raw("column + ?", [delta])`.
- Pagination: always `.paginate({ page_size, current_page })` (see `plugins/knex/paginator.js`).
  Reuse the `response-pagination` schema. Never write manual `OFFSET/LIMIT`.
- **Migrations:** create with `npm run migrate:make -- <description>`. Never edit an existing
  migration. Migrations are additive only.

### Transactions
Any operation that writes more than one row across tables uses an explicit transaction. Pass the
transaction as the repo context. Publish events and tasks **after** the commit, outside the block.

```javascript
const knexTrx = await fastify.knex.transaction();
try {
  await createOrder.call(knexTrx, { row: orderRow, logTrace });
  await createPayment.call(knexTrx, { row: paymentRow, logTrace });
  await knexTrx.commit();
} catch (error) {
  await knexTrx.rollback();
  throw error;                       // let the central error handler respond
}
fastify.publishEvent({ data, event_info, logTrace });   // only after a successful commit
```
A single-table, single-row write needs no transaction.

---

## Errors

- **Do not `try/catch` in every layer.** Let errors bubble to the central error handler.
- The only valid `try/catch` is around a database transaction (rollback, then re-throw).
- Expected failures: `throw CustomError.create({ httpCode, message, property, code })`.
- Failed downstream HTTP calls: `CustomError.createHttpError({ httpCode, errorResponse, downstream_system })`
  (`fastify.request` already does this for non-2xx responses).
- Import it with `const { CustomError } = require("<path>/errorHandler");`.
- Add database or validation error mappings in `errorHandler/mappers/`.

## Schemas (AJV)

- One schema file per endpoint, re-exported from `schemas/index.js`.
- Request and response schemas are separate objects. Never reuse one for both.
- Every schema has `tags` and `summary` (they feed the Swagger docs).
- Spread `...errorSchemas` into `response` so error shapes are documented.
- **Shared fragments** (headers, audit, amount, pagination, errors) live in `commons/schemas/` with an
  `$id` and are referenced with `$ref` (for example `headers: { $ref: "request-headers#" }`).
  If a fragment is used by more than one endpoint, move it there. Never copy it inline.

## Events, tasks and calls to other services

- Events: `fastify.publishEvent({ data, event_info, logTrace })`, called from the **service** after commit.
  Incoming Pub/Sub pushes: `fastify.parseEvent({ event })`.
- Background or delayed work: `fastify.createCloudTask({ url, payload, delayInSeconds, logTrace })`.
- Other services: `fastify.request({...})` inside `repository/downstreamCalls.js`. Always pass
  `downstream_system`, `source_system`, `domain` and `functionality` so logs and metrics are labelled.
- Put dynamic data a processor needs **in the event payload**. Do not make extra API calls at
  processing time for data the event already knows.

## Shutdown and cleanup

- The process shuts down gracefully on `SIGTERM` / `SIGINT`: `src/app/commons/gracefulShutdown.js` calls
  `fastify.close()`, which stops new connections, waits for in-flight requests, then runs `onClose` hooks.
- **Any plugin that opens a connection, client, pool or timer must close it in an `onClose` hook**
  (see `plugins/knex/index.js`). Without it, shutdown hangs or loses data.
- `onClose` hooks run in reverse registration order, so plugins registered early (knex) close last.
- Never call `process.exit()` in feature code. Only `gracefulShutdown.js` does.
- Test the hook: register the plugin on a fresh Fastify instance, `await fastify.close()`, and assert the
  client's `close()` or `destroy()` was called (see `plugins/pubsub/__tests__`).

## Date and time

Never use raw `new Date()`. Always use `moment-timezone`, with the default time zone constant:

```javascript
const moment = require("moment-timezone");
const { DEFAULT_TIME_ZONE } = require("../commons/constants");

const now = moment().tz(DEFAULT_TIME_ZONE).toISOString();
```
Audit fields: `getAuditInfo(entity)` from `commons/helpers.js` (adds `created_at`, `updated_at`, `created_by`).

## Logging and tracing

- `request.logTrace` is built by the `extractLogTrace` hook from the trace headers
  (`x-request-id`, `x-b3-traceid`, `x-user-journey-id`, ...). Pass `logTrace` through every service
  and repository call and spread it into outgoing HTTP headers.
- Log with `fastify.log.info({ message, log_trace: logTrace, ... })`. Always structured objects, never string concatenation.
- In route code use `request.log` (it adds the request id as `reqId`); elsewhere use `fastify.log`.
- `reqId` is the gateway's `x-request-id` (or a generated UUID), set by `genReqId` in `commons/configs.js`.

### Never log secrets
- **Anything that may contain user input must go through `redactSensitiveData({ data })`**
  (`commons/redactor.js`) before it is logged: request and response bodies, query params, headers,
  data sent to or received from other services. It replaces the value of keys such as `password`, `otp`,
  `token`, `authorization` and `x-api-key` with `****`, at any depth, without changing the original.
- The list of keys is `SENSITIVE_KEYS` in `commons/constants.js`. Add new key names there.
- **Log URLs without the query string** (`removeQueryString({ url })`), because query strings can hold secrets.
  The redacted query params are logged separately.
- **Never log a raw error object from an HTTP client.** An axios error contains the request headers and
  body. Log `message`, `code` and the status instead (see `buildLoggableError` in `plugins/httpClient`).
- The request log has the redacted body, query params and headers. The response log has the status, timing
  and the redacted **response body** (captured in the `preSerialization` hook). The request body is only
  repeated in the response log when `LOG_REQUEST_BODY_IN_RESPONSE=true`.

## API design

- Prefer **one POST endpoint with a type discriminator** (`type`, `campaign_type`, ...) plus schema
  `if/then` conditionals over separate type-specific endpoints for the same resource.
- Fields that classify an entity or decide how it is processed live at the **top level** of the entity,
  never nested inside `config`, `condition` or `metadata` objects.
- Auth tokens are validated upstream by the gateway. Do not re-validate JWTs in the service.
  Mutations take the user from `body.audit`; GET requests take `user_id` as a query param.

---

## Testing

- **Unit tests** mock Fastify plugins and repositories and test the service or helper in isolation. The next section covers integration tests, which use a real database.
- Name: `<thing>.test.js`, inside `__tests__/` next to the code.
- Mock repos with `jest.mock("../../repository/users")` and assert on the named functions.
- Use the shared Knex chain mock in `repository/__mocks__/knex.mock.js` for repository tests.
- `clearMocks` is enabled in the Jest config, so call history resets between tests.
- Coverage threshold is 50% for statements, branches, functions and lines.
- Test the behaviour that matters: the happy path, each business rule, and each error you throw.

---

## Integration (E2E) tests

Integration tests run the **real app against a real PostgreSQL**, using Fastify `inject`, seeded data and
golden files. They check the whole contract: validation, status codes, error shapes and what is really stored.

```bash
npm run migrate:test        # prerequisite: latest migrations on the test database (also after adding a migration)
npm run test:e2e            # run all integration tests
npm run test:e2e -- tests/e2e/users            # one folder
npm run test:e2e -- -t "creates a user"        # one test by name
```

### When to write one
- **Every new endpoint** gets E2E tests: the success case (and check the stored row with `queryRows`), and one test
  per error status the endpoint can return (400 validation, 404, 409, ...).
- Business rules that touch several rows or tables (transactions) get an E2E test that reads the database back.
- Use unit tests for logic and E2E tests for the contract. Do not repeat every unit test as an E2E test.

### How a test file looks
```javascript
const testutil = require("../testutil/testutil");

beforeAll(() => testutil.initServer());
afterAll(() => testutil.teardownServer());

test("returns 409 when the user already exists", async () => {
  const { statusCode, body } = await testutil.postJson({ path: "/v1/users", body: existingUserBody });

  expect(statusCode).toBe(409);
  testutil.assertJsonEqual({
    expected: testutil.loadMockJson({ directory: __dirname, fileName: "create_user_duplicate_name.response.mock.json" }),
    actual: body
  });
});
```

### Rules
1. **Real database only, and only a `_test` one.** The tests refuse to run on any database whose name is not `test` or does not end with `_test`. Never weaken this check. Never `TRUNCATE`.
2. **Deterministic seed data.** Seed rows have fixed ids (for example `a0000001-0000-0000-0000-000000000001`). Put them in `tests/testdata/seed.sql`, or in `<feature>_seed.sql` and `<feature>_teardown.sql` passed to `initServer({ seedFileName, teardownFileName })`.
3. **Every seeded or created row must be removed by teardown.** Add the deletes to the teardown file, child tables first, by explicit id. Rows created by tests use a name prefix (see `buildUniqueUserName`) that teardown deletes by pattern.
4. **Unique data per test.** Build names and ids with a helper. Never share mutable state between tests.
5. **Golden files for error and list responses:** `tests/e2e/<feature>/__mocks__/<scenario>.response.mock.json`. Use `ignoreKeys` for generated values (ids, timestamps). Use `ignoreArrayOrder` only when the order is not part of the contract.
6. **Check the database, not only the response.** After a write, read the row back with `queryRows`. After a rejected request, check that nothing was written.
7. **Quiet logs.** `tests/.test.env` sets `LOG_LEVEL=silent`. Raise it to `info` only while debugging.
8. **Run `npm run migrate:test` before `npm run test:e2e`.** The tests do not migrate the database; they fail if migrations are pending. Run `npm run test:e2e` after changing an endpoint, a schema, a migration or error handling.
9. Add every new test to `tests/e2e/E2E_TEST_CASES.md`.

## Recipe: add a new endpoint

Example: `GET /v1/users/:userId` (a good practice exercise: nothing exists for it yet).

1. **Schema.** `schemas/getUserById.js` (request and response, tags, summary). Export it from `schemas/index.js`.
   Write this file first: the schema is the API contract.
2. **Repository.** Add `getUserById` to `repository/users.js` (`{ userId, logTrace }`, uses `logQuery`).
3. **Transformer.** Add `toUserResponse` mapping if the response shape differs from the row.
4. **Service.** `services/getUserById.js`: call the repo, throw `CustomError.create({ httpCode: 404, ... })`
   when the user does not exist, return the transformed response.
5. **Handler.** `handlers/getUserById.js`. Export it from `handlers/index.js`.
6. **Route.** Register it in `routes/index.js`.
7. **Unit tests.** Service test (found and not-found), repository test, transformer test.
8. **Integration tests.** In `tests/e2e/users/`: add seed rows if needed, then tests for the success case (with a database check) and for 404. Add golden files for the error responses.
9. **Verify.** `npm run lint:fix`, `npm run test:unit` and `npm run test:e2e`.

## Recipe: add a new module

A ready-made prompt for this is in `sample_claude_prompt.md` (entity definition in `samples/address.json`).

Copy the `users/` folder structure, rename files and constants to the new domain, register the
module's routes in `src/index.js` with a prefix (`fastify.register(routes, { prefix: "/v1" })`), and
add a migration with `npm run migrate:make -- create_table_<name>`.

## Definition of done

- [ ] `npm run lint:fix` is clean
- [ ] `npm run test:unit` passes
- [ ] `npm run test:e2e` passes, and new endpoints have E2E tests with golden files for their errors
- [ ] No `let` (except `for` counters), no `for...of`, no raw `new Date()`
- [ ] Every function takes one destructured object (framework signatures excepted)
- [ ] No database calls in loops, no `try/catch` outside transactions
- [ ] Repos receive `{ row }`, `{ rows }` or `{ fields }` and contain no data shaping
- [ ] Multi-table writes use a transaction, and events are published after commit
- [ ] Schemas have `tags` and `summary`, and shared fragments use `$ref`
- [ ] Table and column names come from `commons/models.js`
- [ ] Plugins that open a connection, client or timer close it in an `onClose` hook
- [ ] Anything logged that may contain user input goes through `redactSensitiveData`
- [ ] No secrets, `.env` files or credentials in the change

---

## Known deviations (do not imitate these)

Some infrastructure files are older and do not follow every rule above. Follow the rules, not these files.

- `src/app/plugins/ajv`, `plugins/httpClient`, `plugins/knex` and `src/app/errorHandler/` use `let`,
  `try/catch` or positional arguments in places. They are framework glue. Do not copy their style into feature code.
- `src/app/hooks/logging` uses `this.log` and `(request, reply)` signatures because Fastify requires them.
- `plugins/pubsub` intentionally swallows publish errors (it logs and returns `false`) so a failed event
  never fails the request. Keep that behaviour; do not copy it for other code.
- `getAuditInfo(entity)` takes a single positional argument (the entity object).
- `src/app/commons/gracefulShutdown.js` uses `try/catch` and `process.exit` because it is the process boundary. Feature code must not.
- `users/` has no `preHandlers/` or `helpers/` folder yet. Create one only when a module needs it.
