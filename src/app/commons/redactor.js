const { SENSITIVE_KEYS, REDACTED_VALUE } = require("./constants");

const CIRCULAR_VALUE = "[Circular]";

function isSensitiveKey({ key }) {
  return SENSITIVE_KEYS.includes(key.toLowerCase());
}

// Only plain objects and arrays are walked. Dates, Buffers, streams, FormData
// and other class instances are returned untouched, so they are never damaged.
// "Plain" includes objects created without a prototype, which is how Fastify
// builds request.query.
function isRedactable({ value }) {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

function redactObjectValues({ object, redactNested }) {
  const redactedEntries = Object.entries(object).map(([key, value]) => [
    key,
    isSensitiveKey({ key }) ? REDACTED_VALUE : redactNested(value)
  ]);
  return Object.fromEntries(redactedEntries);
}

/**
 * Returns a copy of `data` where the value of every sensitive key (password, otp,
 * token, authorization, ...) is replaced by "****", at any depth. The input is never changed.
 */
function redactSensitiveData({ data, visitedPath = new Set() }) {
  if (!isRedactable({ value: data })) return data;
  if (visitedPath.has(data)) return CIRCULAR_VALUE;

  visitedPath.add(data);
  const redactNested = value =>
    redactSensitiveData({ data: value, visitedPath });
  const redactedData = Array.isArray(data)
    ? data.map(redactNested)
    : redactObjectValues({ object: data, redactNested });
  visitedPath.delete(data);
  return redactedData;
}

// Query strings often carry secrets (?otp=...). Log the path only, the redacted
// query parameters are logged separately.
function removeQueryString({ url }) {
  return typeof url === "string" ? url.split("?")[0] : url;
}

module.exports = { redactSensitiveData, removeQueryString };
