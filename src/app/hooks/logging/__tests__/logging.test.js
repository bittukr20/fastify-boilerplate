const {
  requestLogging,
  captureResponseBody,
  responseLogging,
  extractLogTrace
} = require("../index");

function buildRequest(overrides = {}) {
  return {
    url: "/v1/users",
    method: "POST",
    query: { otp: "9999", page: "1" },
    body: { full_name: "Asha", password: "hunter2" },
    headers: { authorization: "Bearer abc", "x-channel-id": "WEB" },
    logTrace: { "x-request-id": "req-1" },
    log: { info: jest.fn() },
    server: { config: {} },
    ...overrides
  };
}

describe("logging hooks", () => {
  describe("requestLogging", () => {
    test("logs the request with sensitive values redacted", async () => {
      const request = buildRequest();

      await requestLogging(request);

      expect(request.log.info).toHaveBeenCalledWith({
        message: "Incoming Request",
        log_trace: { "x-request-id": "req-1" },
        request: {
          url: "/v1/users",
          method: "POST",
          query_params: { otp: "****", page: "1" },
          body: { full_name: "Asha", password: "****" },
          raw_headers: { authorization: "****", "x-channel-id": "WEB" }
        }
      });
    });

    test("logs the path without the query string", async () => {
      const request = buildRequest({ url: "/v1/users?otp=777111" });

      await requestLogging(request);

      const [loggedObject] = request.log.info.mock.calls[0];
      expect(loggedObject.request.url).toBe("/v1/users");
      expect(JSON.stringify(loggedObject)).not.toContain("777111");
    });

    test("does not change the real request body", async () => {
      const request = buildRequest();

      await requestLogging(request);

      expect(request.body.password).toBe("hunter2");
    });

    test.each(["/health", "/metrics"])("does not log %s", async url => {
      const request = buildRequest({ url });

      await requestLogging(request);

      expect(request.log.info).not.toHaveBeenCalled();
    });
  });

  describe("captureResponseBody", () => {
    test("keeps the payload on the request and passes it on unchanged", async () => {
      const request = buildRequest();
      const payload = { user_id: "u1" };

      const result = await captureResponseBody(request, {}, payload);

      expect(result).toBe(payload);
      expect(request.responseBody).toBe(payload);
    });

    test.each(["/health", "/metrics"])(
      "does not keep the payload of %s",
      async url => {
        const request = buildRequest({ url });

        await captureResponseBody(request, {}, { status: "ok" });

        expect(request.responseBody).toBeUndefined();
      }
    );
  });

  describe("responseLogging", () => {
    const reply = { statusCode: 201, elapsedTime: 12.5 };

    test("logs status, timing and the redacted response body", async () => {
      const request = buildRequest({
        responseBody: { user_id: "u1", access_token: "abc", full_name: "Asha" }
      });

      await responseLogging(request, reply);

      expect(request.log.info).toHaveBeenCalledWith({
        message: "Server Response",
        log_trace: { "x-request-id": "req-1" },
        request: { url: "/v1/users", method: "POST" },
        response: {
          status_code: 201,
          response_time: 12.5,
          body: { user_id: "u1", access_token: "****", full_name: "Asha" }
        }
      });
    });

    test("does not repeat the request body or headers by default", async () => {
      const request = buildRequest({ responseBody: { user_id: "u1" } });

      await responseLogging(request, reply);

      const [loggedObject] = request.log.info.mock.calls[0];
      expect(loggedObject.request).toEqual({
        url: "/v1/users",
        method: "POST"
      });
    });

    test("adds the redacted request body when LOG_REQUEST_BODY_IN_RESPONSE is true", async () => {
      const request = buildRequest({
        responseBody: { user_id: "u1" },
        server: { config: { LOG_REQUEST_BODY_IN_RESPONSE: true } }
      });

      await responseLogging(request, reply);

      const [loggedObject] = request.log.info.mock.calls[0];
      expect(loggedObject.request).toEqual({
        url: "/v1/users",
        method: "POST",
        body: { full_name: "Asha", password: "****" }
      });
    });

    test("does not log the query string or leave secrets in the response line", async () => {
      const request = buildRequest({
        url: "/v1/users?otp=777111",
        responseBody: { otp: "123456" },
        server: { config: { LOG_REQUEST_BODY_IN_RESPONSE: true } }
      });

      await responseLogging(request, reply);

      const output = JSON.stringify(request.log.info.mock.calls[0][0]);
      expect(output).not.toContain("777111");
      expect(output).not.toContain("123456");
      expect(output).not.toContain("hunter2");
    });

    test("logs no body for responses without one", async () => {
      const request = buildRequest();

      await responseLogging(request, { statusCode: 204, elapsedTime: 1 });

      const [loggedObject] = request.log.info.mock.calls[0];
      expect(loggedObject.response.body).toBeUndefined();
    });

    test("does not log /health", async () => {
      const request = buildRequest({ url: "/health" });

      await responseLogging(request, { statusCode: 200, elapsedTime: 1 });

      expect(request.log.info).not.toHaveBeenCalled();
    });
  });

  describe("extractLogTrace", () => {
    test("keeps only the trace headers that are present", async () => {
      const request = {
        headers: {
          "x-request-id": "req-1",
          "x-b3-traceid": "trace-1",
          "x-user-journey-id": "journey-1",
          authorization: "Bearer abc"
        }
      };

      await extractLogTrace(request);

      expect(request.logTrace).toEqual({
        "x-request-id": "req-1",
        "x-b3-traceid": "trace-1",
        "x-user-journey-id": "journey-1"
      });
    });
  });
});
