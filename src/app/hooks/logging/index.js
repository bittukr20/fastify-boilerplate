const {
  redactSensitiveData,
  removeQueryString
} = require("../../commons/redactor");

const URLS_NOT_LOGGED = ["/health", "/metrics"];

function isUrlNotLogged({ url }) {
  return URLS_NOT_LOGGED.includes(url);
}

// request.log is a child logger that adds the request id (reqId) to every line.
async function requestLogging(request) {
  if (isUrlNotLogged({ url: request.url })) return;

  request.log.info({
    message: "Incoming Request",
    log_trace: request.logTrace,
    request: {
      url: removeQueryString({ url: request.url }),
      method: request.method,
      query_params: redactSensitiveData({ data: request.query }),
      body: redactSensitiveData({ data: request.body }),
      raw_headers: redactSensitiveData({ data: request.headers })
    }
  });
}

function shouldLogRequestBodyInResponse({ request }) {
  return Boolean(request.server?.config?.LOG_REQUEST_BODY_IN_RESPONSE);
}

function buildRequestLogForResponse({ request }) {
  const requestLog = {
    url: removeQueryString({ url: request.url }),
    method: request.method
  };
  if (!shouldLogRequestBodyInResponse({ request })) return requestLog;
  return { ...requestLog, body: redactSensitiveData({ data: request.body }) };
}

// Runs before the reply is serialized, so the payload is still an object.
// It is kept on the request and logged (redacted) once the response is sent.
async function captureResponseBody(request, _reply, payload) {
  if (!isUrlNotLogged({ url: request.url })) {
    request.responseBody = payload;
  }
  return payload;
}

// The request body is only repeated here when LOG_REQUEST_BODY_IN_RESPONSE is true.
async function responseLogging(request, reply) {
  if (isUrlNotLogged({ url: request.url })) return;

  request.log.info({
    message: "Server Response",
    log_trace: request.logTrace,
    request: buildRequestLogForResponse({ request }),
    response: {
      status_code: reply.statusCode,
      response_time: reply.elapsedTime,
      body: redactSensitiveData({ data: request.responseBody })
    }
  });
}

function buildLogTrace(req, ...headers) {
  return headers.reduce(
    (logTrace, header) =>
      Object.assign(
        logTrace,
        req.headers[header] && {
          [header]: req.headers[header]
        }
      ),
    {}
  );
}

async function extractLogTrace(request) {
  request.logTrace = buildLogTrace(
    request,
    "x-request-id",
    "x-channel-id",
    "x-b3-traceid",
    "x-device-id",
    "x-app-version",
    "x-user-journey-id",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-ot-span-context",
    "x-b3-flags"
  );
}
module.exports = {
  requestLogging,
  captureResponseBody,
  responseLogging,
  extractLogTrace
};
