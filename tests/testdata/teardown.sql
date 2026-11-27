-- ============================================================
-- E2E Test Teardown
-- Deletes all data created by seed.sql and by the tests.
-- Order: child tables first, then parent tables.
-- Explicit ids or prefixes only. Never TRUNCATE.
-- Safe to run on an already clean database.
-- ============================================================
BEGIN;

-- Users seeded by seed.sql
DELETE FROM "user"
WHERE
  id IN ('a0000001-0000-0000-0000-000000000001');

-- Users created by the tests (their names start with the E2E_NAME_PREFIX)
DELETE FROM "user"
WHERE
  full_name LIKE 'e2e-user-%';

COMMIT;
