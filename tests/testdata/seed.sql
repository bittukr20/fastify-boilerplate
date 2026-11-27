-- ============================================================
-- E2E Test Seed Data
-- All ids are deterministic, so tests can assert on them.
-- Run by tests/e2e/testutil (initServer) after teardown.sql.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
-- An existing user. Used to test the duplicate full_name error.
INSERT INTO
  "user" (id, full_name, phone_number)
VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'Seeded User Existing',
    '{"country_code": "+91", "number": "9000000001"}'
  );

COMMIT;
