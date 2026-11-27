const optionalString = { type: "string" };

exports.envSchema = {
  type: "object",
  properties: {
    DB_USER: {
      type: "string",
      default: "postgres"
    },
    DB_PASSWORD: {
      type: "string",
      default: "postgres"
    },
    DB_NAME: {
      type: "string",
      default: "postgres"
    },
    DB_HOST: {
      type: "string",
      default: "localhost"
    },
    DB_PORT: {
      type: "string",
      default: "5432"
    },
    ENVIRONMENT: {
      type: "string",
      default: "DEV"
    },
    // Max time to wait for in-flight requests on shutdown. Defaults to 25000,
    // which fits inside the 30s Kubernetes termination grace period
    SHUTDOWN_TIMEOUT_IN_MS: { type: "integer" },
    // Also repeat the (redacted) request body in the response log line
    LOG_REQUEST_BODY_IN_RESPONSE: { type: "boolean", default: false },
    // Downstream systems
    DOWNSTREAM_SYSTEM_URI: optionalString,
    // Google Cloud (used by the cloud plugins)
    GCP_PROJECT_ID: optionalString,
    GCP_LOCATION: optionalString,
    CLOUD_TASKS_DEFAULT_QUEUE: optionalString,
    CLOUD_BUCKET_NAME: optionalString,
    DATASTORE_NAMESPACE: optionalString,
    // Redis (used by the opt-in redisCache plugin)
    REDIS_HOST: optionalString,
    REDIS_PORT: { type: "integer", default: 6379 },
    REDIS_PASSWORD: optionalString
  }
};
