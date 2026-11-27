const { redactSensitiveData, removeQueryString } = require("../redactor");

describe("redactSensitiveData", () => {
  test("redacts sensitive keys and keeps everything else", () => {
    const result = redactSensitiveData({
      data: { full_name: "Asha", password: "hunter2", otp: "1234" }
    });

    expect(result).toEqual({
      full_name: "Asha",
      password: "****",
      otp: "****"
    });
  });

  test("redacts at any depth, including inside arrays", () => {
    const result = redactSensitiveData({
      data: {
        user: { credentials: { token: "abc" } },
        devices: [{ name: "phone", refresh_token: "xyz" }]
      }
    });

    expect(result).toEqual({
      user: { credentials: { token: "****" } },
      devices: [{ name: "phone", refresh_token: "****" }]
    });
  });

  test("matches keys regardless of case, including headers", () => {
    const result = redactSensitiveData({
      data: {
        Authorization: "Bearer secret",
        "X-API-Key": "k",
        "x-channel-id": "WEB"
      }
    });

    expect(result).toEqual({
      Authorization: "****",
      "X-API-Key": "****",
      "x-channel-id": "WEB"
    });
  });

  test("does not change the input object", () => {
    const input = { password: "hunter2", nested: { otp: "1" } };

    redactSensitiveData({ data: input });

    expect(input).toEqual({ password: "hunter2", nested: { otp: "1" } });
  });

  test("handles circular references without crashing", () => {
    const input = { name: "loop", password: "x" };
    input.self = input;

    const result = redactSensitiveData({ data: input });

    expect(result).toEqual({
      name: "loop",
      password: "****",
      self: "[Circular]"
    });
  });

  test("does not mistake a repeated, non-circular object for a circular one", () => {
    const shared = { otp: "1", label: "same" };

    const result = redactSensitiveData({
      data: { first: shared, second: shared }
    });

    expect(result).toEqual({
      first: { otp: "****", label: "same" },
      second: { otp: "****", label: "same" }
    });
  });

  test("returns primitives, null and undefined as they are", () => {
    expect(redactSensitiveData({ data: "text" })).toBe("text");
    expect(redactSensitiveData({ data: 42 })).toBe(42);
    expect(redactSensitiveData({ data: null })).toBeNull();
    expect(redactSensitiveData({ data: undefined })).toBeUndefined();
  });

  test("leaves class instances such as Date and Buffer untouched", () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const payload = Buffer.from("binary");

    const result = redactSensitiveData({ data: { createdAt, payload } });

    expect(result.createdAt).toBe(createdAt);
    expect(result.payload).toBe(payload);
  });

  test("redacts objects that have no prototype, like Fastify's request.query", () => {
    // Fastify builds request.query from an object whose prototype has no prototype
    function QueryObject() {}
    QueryObject.prototype = Object.create(null);
    const query = new QueryObject();
    query.otp = "777111";
    query.page = "1";

    const result = redactSensitiveData({ data: query });

    expect({ ...result }).toEqual({ otp: "****", page: "1" });
  });
});

describe("removeQueryString", () => {
  test("removes everything after the question mark", () => {
    expect(removeQueryString({ url: "/v1/users?otp=777111&page=1" })).toBe(
      "/v1/users"
    );
  });

  test("keeps a url that has no query string", () => {
    expect(removeQueryString({ url: "/v1/users" })).toBe("/v1/users");
  });

  test("returns non-string values as they are", () => {
    expect(removeQueryString({ url: undefined })).toBeUndefined();
  });
});
