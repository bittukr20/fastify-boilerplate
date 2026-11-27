# Sample Claude prompt: build a new entity module

A ready-to-use prompt for [Claude Code](https://claude.com/claude-code). It builds a complete module
(migration, schemas, handlers, services, repository, transformer, routes and tests) in the style of this
boilerplate, from two inputs:

1. **An entity definition** in JSON: [`samples/address.json`](samples/address.json)
2. **The list of APIs you need**: the table inside the prompt below

The example builds an **address** module (an address belongs to a user). To build your own entity, change
the two inputs and keep the rest. See [Reuse it for your own entity](#reuse-it-for-your-own-entity).

---

## How to use it

1. Open a terminal in the repo root and start Claude Code: `claude`
2. Copy the prompt below and paste it.
3. Claude reads `CLAUDE.md`, then replies with a **short plan**. Check it, then answer `go`.
4. Claude builds the module, runs `npm run lint:fix` and `npm run test:unit`, and summarises what it did.

> The `@samples/address.json` part is a file reference. Claude Code reads the file for you.

---

## The prompt

```text
Build a new module for the entity described below. Follow CLAUDE.md exactly.

ENTITY
- Entity definition: @samples/address.json (read it fully: fields, types, validation rules, example)
- Module folder: src/app/addresses/
- API base path: /v1/addresses
- Table: address (it does not exist yet, create it with a new migration)

APIS REQUIRED
| # | Method | Path                      | What it does                                                                                      | Success                           | Errors                                |
|---|--------|---------------------------|---------------------------------------------------------------------------------------------------|-----------------------------------|---------------------------------------|
| 1 | POST   | /v1/addresses             | Create an address                                                                                 | 201 { "address_id": "<uuid>" }    | 400 validation                        |
| 2 | GET    | /v1/addresses/:address_id | Get one address                                                                                   | 200 the address                   | 404 ADDRESS_NOT_FOUND                 |
| 3 | GET    | /v1/addresses             | List addresses. Query: user_id (required), page (default 1), page_size (default 10, max 50). Newest first | 200 { data: [...], meta: { pagination } } | 400 validation                |
| 4 | PATCH  | /v1/addresses/:address_id | Partial update. At least one field is required. user_id cannot be changed                         | 200 the updated address           | 400 validation, 404 ADDRESS_NOT_FOUND |
| 5 | DELETE | /v1/addresses/:address_id | Delete an address (hard delete)                                                                   | 204 no body                       | 404 ADDRESS_NOT_FOUND                 |

BUSINESS RULES
1. A user can have only one default address (is_default = true). When an address is created or updated with
   is_default = true, set is_default = false on that user's other addresses in the SAME transaction.
2. Creating an address for a user_id that does not exist must fail with a 400. Let the database foreign key
   reject it (the existing Postgres error mapper turns it into a 400). Do not add an extra query for it.
3. Request bodies reject unknown fields (additionalProperties: false).
4. created_at is returned in every address response, but it is never accepted in a request body.

OPTIONS
- Audit fields (created_by, updated_by via getAuditInfo): no
- Publish events: no
- Soft delete: no

HOW TO WORK
1. Read CLAUDE.md first. Then open the users module files that CLAUDE.md lists under "Copy these examples"
   before writing anything.
2. Check migrations/ for existing tables. Create the table with `npm run migrate:make -- create_table_address`.
   Never edit an existing migration. Add an index on user_id.
3. Before writing code, show me a SHORT plan: the files you will create, the migration, the 5 endpoints,
   and anything that is unclear. Then wait for my "go".
4. Implement in this order: schemas, migration, repository, transformer, service, handler, routes,
   registration in src/index.js, tests.
5. Do not change the users module or any unrelated file. The only existing file you may edit is src/index.js
   (to register the new routes with the /v1 prefix).
6. When done: run `npm run lint:fix` and `npm run test:unit`, fix any failure, then summarise:
   the files you created, any assumption you made, and one curl command per endpoint.
```

---

## What each part does

| Part of the prompt | Why it is there | What to change for a new entity |
| --- | --- | --- |
| **ENTITY** | Points Claude to the field definitions, and fixes the folder name, base path and table name | Entity file, module folder, base path, table name |
| **APIS REQUIRED** | The contract. One row per endpoint with the exact status codes and errors | The whole table |
| **BUSINESS RULES** | The decisions the code cannot guess (uniqueness, defaults, side effects) | Your own rules. Delete the ones that do not apply |
| **OPTIONS** | Yes/no switches that change the generated code | Flip them to `yes`, for example audit fields or events |
| **HOW TO WORK** | The process: read the rules, plan first, build in a safe order, stay inside the module, verify | Usually nothing |

The prompt is short on purpose. The coding rules (layers, naming, errors, transactions, logging, tests) are
not repeated in it, because `CLAUDE.md` already contains them.

---

## Reuse it for your own entity

1. Copy `samples/address.json` to `samples/<your_entity>.json` and describe your fields (see the table below).
2. Copy the prompt and replace the **ENTITY** block: the file name, module folder, base path and table name.
3. Rewrite the **APIs REQUIRED** table. Keep only the endpoints you need.
4. Rewrite the **BUSINESS RULES**. If you have none, write `None beyond the field validation.`
5. Run it, review the plan, answer `go`.

### The entity JSON

Each item in `fields` describes one field. Use only the keys you need.

| Key | Meaning | Example |
| --- | --- | --- |
| `name` | API field name, in `snake_case` | `"pincode"` |
| `type` | `string`, `number`, `integer`, `boolean`, `uuid`, `timestamp`, `object`, `array` | `"string"` |
| `required` | Must be sent when creating | `true` |
| `immutable` | Can be set on create, never changed later | `true` |
| `read_only` / `generated` | Returned in responses, never accepted in requests | `true` |
| `enum` | The only allowed values | `["HOME", "WORK", "OTHER"]` |
| `min_length` / `max_length` | String length limits | `3` / `100` |
| `minimum` / `maximum` | Number limits | `-90` / `90` |
| `pattern` | Regular expression for a string | `"^[0-9]{6}$"` |
| `default` | Value used when the field is missing | `"IN"` |
| `references` | Foreign key, as `table.column` | `"user.id"` |
| `stored_as` | Store an object as `jsonb` | `"jsonb"` |
| `properties` | Fields inside an `object` | latitude, longitude |
| `description` | Free text that helps Claude pick the right behaviour | |

`primary_key` maps the API field to the database column (here `address_id` in the API and `id` in the table),
the same way the users module maps `user_id` to `id`. `example` is a complete sample response.

---

## Small changes: mini prompts

For small edits you do not need the full prompt. Ask in one or two sentences, and always add
`Follow CLAUDE.md.` Replace the names in angle brackets.

**Add a field**
```text
Add a field `<name>` (<type>, <required or optional>, <constraints>) to the address entity.
Update samples/address.json, the schemas, a NEW additive migration, the transformer and the tests.
Never edit existing migrations. Follow CLAUDE.md.
```

**Add an endpoint**
```text
Add `<METHOD> <path>` to the addresses module. It should <what it does>.
Success: <status and body>. Errors: <status and code>. Add schema, handler, service, route and tests.
Follow CLAUDE.md.
```

**Add a list filter**
```text
Add an optional query filter `<field>` to GET /v1/addresses. Update the schema, the repository query
(keep using .paginate()), the service and the tests. Follow CLAUDE.md.
```

**Change a validation rule**
```text
Change the validation of `<field>` to <new rule>. Update the schema and the tests, and any message
that mentions the old rule. Follow CLAUDE.md.
```

**Add a business rule**
```text
Add this rule to the addresses module: <rule>. Put the logic in the service. If it writes more than one
row, use a transaction. Add a test for the rule and for the error it throws. Follow CLAUDE.md.
```

**Publish an event after create**
```text
After an address is created, publish a `ADDRESS_CREATED` event with the address as the payload.
Publish after the commit, from the service, using fastify.publishEvent. Add the event name to the
module constants and update the service test. Follow CLAUDE.md.
```

**Review before merging**
```text
Review the addresses module against CLAUDE.md, especially the "Definition of done" checklist.
List every rule that is broken, with the file and line. Do not change any code yet.
```

---

## Tips for better results

- **Be exact about status codes and error codes.** "Returns 404 ADDRESS_NOT_FOUND" beats "handle missing".
- **Say what already exists and what must not change.** The prompt limits edits to the new module and `src/index.js`.
- **Keep the plan step.** A wrong assumption is cheap to fix in a plan and expensive to fix in 20 files.
  For small, well-understood work you can delete step 3 of HOW TO WORK and let Claude go straight ahead.
- **One entity per prompt.** Build `address`, review it, then build the next one.
- **Check the result like any teammate's code.** Lint, the tests and code review still decide what ships.
  The summary at the end lists every assumption, so read it.
