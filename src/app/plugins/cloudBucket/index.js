const fp = require("fastify-plugin");
const { Storage } = require("@google-cloud/storage");

const cloudBucketPlugin = async fastify => {
  const bucketName = fastify.config.CLOUD_BUCKET_NAME;
  if (!bucketName) {
    fastify.log.warn(
      "CLOUD_BUCKET_NAME is not set, cloudBucket plugin skipped"
    );
    return;
  }
  const cloudStorage = new Storage();
  fastify.decorate("cloudBucket", cloudStorage.bucket(bucketName));
};

module.exports = fp(cloudBucketPlugin);
