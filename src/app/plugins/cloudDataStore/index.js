const fp = require("fastify-plugin");
const { Datastore } = require("@google-cloud/datastore");

const cloudDataStorePlugin = async fastify => {
  const dataStore = new Datastore({
    namespace: fastify.config.DATASTORE_NAMESPACE
  });
  fastify.decorate("dataStore", dataStore);
};

module.exports = fp(cloudDataStorePlugin);
