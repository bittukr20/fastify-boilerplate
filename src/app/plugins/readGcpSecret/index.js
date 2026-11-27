const fp = require("fastify-plugin");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const SECRET_CACHE_TTL_IN_SECONDS = 3600;
const LATEST_SECRET_VERSION = "latest";

function buildSecretCacheKey({ secretName }) {
  return `GCP_SECRET_${secretName}`;
}

function buildSecretVersionPath({ projectId, secretName }) {
  return `projects/${projectId}/secrets/${secretName}/versions/${LATEST_SECRET_VERSION}`;
}

const readSecretWithCache =
  ({ fastify, client }) =>
  async ({ secretName }) => {
    const cacheKey = buildSecretCacheKey({ secretName });
    const cachedSecret = fastify.memCache.get(cacheKey);
    if (cachedSecret) {
      return cachedSecret;
    }

    const name = buildSecretVersionPath({
      projectId: fastify.config.GCP_PROJECT_ID,
      secretName
    });
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload.data.toString();
    fastify.memCache.set(cacheKey, secretValue, SECRET_CACHE_TTL_IN_SECONDS);
    return secretValue;
  };

// Requires the memCache plugin to be registered first.
const readGcpSecretPlugin = async fastify => {
  const client = new SecretManagerServiceClient();
  fastify.decorate("readGcpSecret", readSecretWithCache({ fastify, client }));
  fastify.addHook("onClose", async () => {
    await client.close();
  });
};

module.exports = fp(readGcpSecretPlugin);
