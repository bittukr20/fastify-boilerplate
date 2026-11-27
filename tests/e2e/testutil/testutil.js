const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const knex = require("knex");
const { knexConfig } = require("../../../config");
const { create } = require("../../../src/index");

const TESTDATA_DIRECTORY = path.join(__dirname, "..", "..", "testdata");
const TEST_DATABASE_NAME_PATTERN = /(^|_)test$/;
const DEFAULT_HEADERS = { "x-channel-id": "WEB" };

// Users created by the tests get this name prefix. teardown.sql deletes every row that has it.
const E2E_NAME_PREFIX = "e2e-user-";

// Rows inserted by seed.sql. The ids are fixed so tests can assert on them.
const SEEDED_USER = {
  id: "a0000001-0000-0000-0000-000000000001",
  full_name: "Seeded User Existing"
};

const state = { app: null, db: null, teardownFileName: null };

async function assertIsTestDatabase() {
  const { rows } = await state.db.raw("select current_database() as name");
  const databaseName = rows[0].name;
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `E2E tests refuse to run on database "${databaseName}". Its name must be "test" or end with "_test".`
    );
  }
}

async function runSqlFile({ fileName }) {
  const filePath = path.join(TESTDATA_DIRECTORY, fileName);
  const sql = fs.readFileSync(filePath, "utf8");
  await state.db.raw(sql);
}

/**
 * Call from beforeAll. Cleans stale data, seeds the database and boots the real app in-process.
 * Test files that need different data pass their own seedFileName and teardownFileName.
 */
async function initServer({
  seedFileName = "seed.sql",
  teardownFileName = "teardown.sql"
} = {}) {
  state.db = knex(knexConfig);
  try {
    await assertIsTestDatabase();
  } catch (error) {
    await state.db.destroy();
    throw error;
  }
  state.teardownFileName = teardownFileName;
  // Teardown first, to clean up data left by a previous run that was killed
  await runSqlFile({ fileName: teardownFileName });
  await runSqlFile({ fileName: seedFileName });

  state.app = await create();
  await state.app.ready();
}

/** Call from afterAll. Removes the seeded data and closes the app and the database connections. */
async function teardownServer() {
  if (state.db && state.teardownFileName) {
    await runSqlFile({ fileName: state.teardownFileName });
  }
  if (state.app) {
    // Closing the app also closes its own database pool (onClose hook of the knex plugin)
    await state.app.close();
  }
  if (state.db) {
    await state.db.destroy();
  }
  state.app = null;
  state.db = null;
}

function parseBody({ response }) {
  return response.payload.length > 0 ? response.json() : undefined;
}

async function sendRequest({ method, path: url, body, headers }) {
  const response = await state.app.inject({
    method,
    url,
    headers: { ...DEFAULT_HEADERS, ...headers },
    ...(body !== undefined && { payload: body })
  });
  return { statusCode: response.statusCode, body: parseBody({ response }) };
}

/** POST JSON to the running app. Returns { statusCode, body }. */
function postJson({ path: url, body, headers }) {
  return sendRequest({ method: "POST", path: url, body, headers });
}

/** GET from the running app. Returns { statusCode, body }. */
function getJson({ path: url, headers }) {
  return sendRequest({ method: "GET", path: url, headers });
}

/** Runs a query on the test database and returns the rows. Use it to check what was stored. */
async function queryRows({ query, bindings = [] }) {
  const result = await state.db.raw(query, bindings);
  return result.rows;
}

/** Loads <directory>/__mocks__/<fileName>. Pass __dirname as the directory. */
function loadMockJson({ directory, fileName }) {
  const filePath = path.join(directory, "__mocks__", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Returns a copy of value without the given keys, at any depth
function stripKeys({ value, keys }) {
  if (Array.isArray(value)) {
    return value.map(item => stripKeys({ value: item, keys }));
  }
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value)
    .filter(([key]) => !keys.includes(key))
    .map(([key, child]) => [key, stripKeys({ value: child, keys })]);
  return Object.fromEntries(entries);
}

// Returns a copy of value where every array is sorted by its JSON text
function sortJsonArrays({ value }) {
  if (Array.isArray(value)) {
    return value
      .map(item => sortJsonArrays({ value: item }))
      .sort((first, second) =>
        JSON.stringify(first) < JSON.stringify(second) ? -1 : 1
      );
  }
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value).map(([key, child]) => [
    key,
    sortJsonArrays({ value: child })
  ]);
  return Object.fromEntries(entries);
}

/**
 * Compares a response body with a golden file.
 * - ignoreKeys: keys removed at any depth before comparing (generated ids, timestamps)
 * - ignoreArrayOrder: compare arrays without caring about their order
 */
function assertJsonEqual({
  expected,
  actual,
  ignoreKeys = [],
  ignoreArrayOrder = false
}) {
  const normalize = value => {
    const withoutIgnoredKeys = stripKeys({ value, keys: ignoreKeys });
    return ignoreArrayOrder
      ? sortJsonArrays({ value: withoutIgnoredKeys })
      : withoutIgnoredKeys;
  };
  expect(normalize(actual)).toEqual(normalize(expected));
}

/** A unique name that teardown.sql will clean up, so tests never clash with each other. */
function buildUniqueUserName({ label }) {
  return `${E2E_NAME_PREFIX}${label}-${randomUUID().slice(0, 8)}`;
}

function buildCreateUserBody({
  fullName,
  countryCode = "+91",
  number = "9876543210"
}) {
  return {
    full_name: fullName,
    phone_number: { country_code: countryCode, number }
  };
}

module.exports = {
  E2E_NAME_PREFIX,
  SEEDED_USER,
  initServer,
  teardownServer,
  postJson,
  getJson,
  queryRows,
  loadMockJson,
  assertJsonEqual,
  buildUniqueUserName,
  buildCreateUserBody
};
