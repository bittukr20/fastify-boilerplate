const fastifyPlugin = require("fastify-plugin");
const moment = require("moment-timezone");
const { CloudTasksClient } = require("@google-cloud/tasks");

const DEFAULT_DELAY_IN_SECONDS = 10;
const DEFAULT_HTTP_METHOD = "POST";

function buildTaskBody({ payload }) {
  return {
    body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    headers: { "Content-Type": "application/json" }
  };
}

function buildTask({ url, payload, httpMethod, delayInSeconds }) {
  const scheduleTimeInSeconds = moment().unix() + delayInSeconds;
  return {
    scheduleTime: { seconds: scheduleTimeInSeconds },
    httpRequest: {
      httpMethod,
      url,
      ...(payload && buildTaskBody({ payload }))
    }
  };
}

const createHttpCloudTask =
  ({ fastify, client }) =>
  async ({
    logTrace,
    url,
    queue,
    payload,
    delayInSeconds = DEFAULT_DELAY_IN_SECONDS,
    httpMethod = DEFAULT_HTTP_METHOD
  }) => {
    const { GCP_PROJECT_ID, GCP_LOCATION, CLOUD_TASKS_DEFAULT_QUEUE } =
      fastify.config;
    const queueName = queue || CLOUD_TASKS_DEFAULT_QUEUE;
    const parent = client.queuePath(GCP_PROJECT_ID, GCP_LOCATION, queueName);
    const task = buildTask({ url, payload, httpMethod, delayInSeconds });

    fastify.log.info({
      message: "Cloud Task Request Details:",
      log_trace: logTrace,
      task_details: task
    });
    const [response] = await client.createTask({ parent, task });
    fastify.log.info({
      message: "Created task Response Details",
      log_trace: logTrace,
      response
    });
    return response;
  };

const cloudTasksPlugin = async fastify => {
  const client = new CloudTasksClient();
  fastify.decorate("createCloudTask", createHttpCloudTask({ fastify, client }));
  fastify.addHook("onClose", async () => {
    await client.close();
  });
};

module.exports = fastifyPlugin(cloudTasksPlugin);
