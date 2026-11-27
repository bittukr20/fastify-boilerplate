const path = require("path");
const dotenv = require("dotenv");
const knex = require("knex");

const TEST_DATABASE_NAME_PATTERN = /(^|_)test$/;

function isConnectionRefused({ error }) {
  const errors = error.errors || [error];
  return errors.some(nestedError => nestedError.code === "ECONNREFUSED");
}

function buildConnectionRefusedMessage() {
  const { DB_HOST, DB_PORT } = process.env;
  return [
    `Cannot reach the E2E test database at ${DB_HOST}:${DB_PORT}.`,
    "Start PostgreSQL and create the database once (createdb test),",
    "or point tests/.test.env at another database named test or ending with _test."
  ].join("\n");
}

async function assertIsTestDatabase({ db }) {
  const { rows } = await db.raw("select current_database() as name");
  const databaseName = rows[0].name;
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `E2E tests refuse to run on database "${databaseName}". Its name must be "test" or end with "_test".`
    );
  }
}

async function assertMigrationsAreLatest({ db }) {
  const [, pendingMigrations] = await db.migrate.list();
  if (pendingMigrations.length > 0) {
    const names = pendingMigrations.map(migration => migration.file).join(", ");
    throw new Error(
      `The test database has pending migrations: ${names}\nRun them first: npm run migrate:test`
    );
  }
}

// Checks the test database once per test run. It never changes the schema: run `npm run migrate:test` first.
module.exports = async () => {
  dotenv.config({
    path: path.join(__dirname, "..", ".test.env"),
    override: true
  });
  // eslint-disable-next-line global-require
  const { knexConfig } = require("../../config");
  const db = knex(knexConfig);
  try {
    await assertIsTestDatabase({ db });
    await assertMigrationsAreLatest({ db });
  } catch (error) {
    if (isConnectionRefused({ error })) {
      throw new Error(buildConnectionRefusedMessage());
    }
    throw error;
  } finally {
    await db.destroy();
  }
};
