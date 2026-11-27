const { SERVER_CONFIGS } = require("../configs");

describe("SERVER_CONFIGS.genReqId", () => {
  test("reuses the x-request-id sent by the gateway", () => {
    const requestId = SERVER_CONFIGS.genReqId({
      headers: { "x-request-id": "gateway-id-1" }
    });

    expect(requestId).toBe("gateway-id-1");
  });

  test("generates a unique id when the header is missing", () => {
    const first = SERVER_CONFIGS.genReqId({ headers: {} });
    const second = SERVER_CONFIGS.genReqId({ headers: {} });

    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });
});
