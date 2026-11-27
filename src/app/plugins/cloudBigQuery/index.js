const fp = require("fastify-plugin");
const { BigQuery } = require("@google-cloud/bigquery");

const cloudBigQueryPlugin = async fastify => {
  const bigQuery = new BigQuery({ projectId: fastify.config.GCP_PROJECT_ID });
  fastify.decorate("bigQuery", bigQuery);
};

module.exports = fp(cloudBigQueryPlugin);
