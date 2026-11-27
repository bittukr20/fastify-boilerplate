const { getError, getRequest } = require("../helpers");

describe("Common Helpers ", () => {
  it("Should RETURN ERRORS", () => {
    const err = getError({});
    expect(err).toEqual({
      data: {
        code: "NO_CODE_FOUND",
        constraint: "NO_CONSTRAINT_FOUND",
        detail: "NO_DETAIL_FOUND",
        errors: "NOT_FOUND",
        message: "NO_MESSAGE_FOUND",
        validationContext: "NO_CONTEXT"
      },
      innerError: { stack: "NO_STACK_FOUND" }
    });
  });

  it("Should RETURN REquest ERRORS", () => {
    const err = getRequest({});
    expect(err).toEqual({
      body: "NO_BODY_FOUND",
      headers: "NO_HEADERS_FOUND",
      method: "NO_METHOD_FOUND",
      url: "NO_URL_FOUND"
    });
  });
});

describe("getRequest redaction", () => {
  test("does not expose secrets from the headers, body or query string", () => {
    const loggedRequest = getRequest({
      raw: { url: "/v1/users?otp=777111", method: "POST" },
      headers: { "x-api-key": "KEY-123", "x-channel-id": "WEB" },
      body: { full_name: "Asha", password: "hunter2" }
    });

    expect(loggedRequest).toEqual({
      url: "/v1/users",
      method: "POST",
      headers: { "x-api-key": "****", "x-channel-id": "WEB" },
      body: { full_name: "Asha", password: "****" }
    });
  });
});
