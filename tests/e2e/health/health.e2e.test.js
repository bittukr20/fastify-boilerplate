const testutil = require("../testutil/testutil");

beforeAll(() => testutil.initServer());
afterAll(() => testutil.teardownServer());

describe("GET /health", () => {
  test("reports that the service is up", async () => {
    const { statusCode, body } = await testutil.getJson({ path: "/health" });

    expect(statusCode).toBe(200);
    expect(body).toEqual({ statusCode: 200, status: "ok" });
  });
});
