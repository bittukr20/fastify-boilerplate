const testutil = require("../testutil/testutil");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeAll(() => testutil.initServer());
afterAll(() => testutil.teardownServer());

describe("POST /v1/users", () => {
  test("creates a user and stores it in the database", async () => {
    const fullName = testutil.buildUniqueUserName({ label: "create" });

    const { statusCode, body } = await testutil.postJson({
      path: "/v1/users",
      body: testutil.buildCreateUserBody({ fullName })
    });

    expect(statusCode).toBe(201);
    expect(body.user_id).toMatch(UUID_PATTERN);

    // Check what was really written to the database
    const rows = await testutil.queryRows({
      query: 'select full_name, phone_number from "user" where id = ?',
      bindings: [body.user_id]
    });
    expect(rows).toEqual([
      {
        full_name: fullName,
        phone_number: { country_code: "+91", number: "9876543210" }
      }
    ]);
  });

  test("returns 400 listing every missing or invalid field", async () => {
    const { statusCode, body } = await testutil.postJson({
      path: "/v1/users",
      body: { full_name: "short" }
    });

    expect(statusCode).toBe(400);
    testutil.assertJsonEqual({
      expected: testutil.loadMockJson({
        directory: __dirname,
        fileName: "create_user_validation_error.response.mock.json"
      }),
      actual: body,
      ignoreArrayOrder: true
    });
  });

  test("returns 409 when a user with the same full_name already exists", async () => {
    const { statusCode, body } = await testutil.postJson({
      path: "/v1/users",
      body: testutil.buildCreateUserBody({
        fullName: testutil.SEEDED_USER.full_name
      })
    });

    expect(statusCode).toBe(409);
    testutil.assertJsonEqual({
      expected: testutil.loadMockJson({
        directory: __dirname,
        fileName: "create_user_duplicate_name.response.mock.json"
      }),
      actual: body
    });
  });

  test("does not store anything when the request is rejected", async () => {
    const fullName = testutil.buildUniqueUserName({ label: "rejected" });

    const { statusCode } = await testutil.postJson({
      path: "/v1/users",
      body: {
        ...testutil.buildCreateUserBody({ fullName }),
        unexpected_field: "not allowed"
      }
    });

    expect(statusCode).toBe(400);
    const rows = await testutil.queryRows({
      query: 'select id from "user" where full_name = ?',
      bindings: [fullName]
    });
    expect(rows).toEqual([]);
  });
});
