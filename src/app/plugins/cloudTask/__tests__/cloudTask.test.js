const Fastify = require("fastify");
const { CloudTasksClient } = require("@google-cloud/tasks");
const cloudTaskPlugin = require("../index");

jest.mock("@google-cloud/tasks");

describe("cloudTask plugin", () => {
  let fastify;
  const queuePath = jest.fn().mockReturnValue("projects/p/queues/q");
  const createTask = jest.fn().mockResolvedValue([{ name: "task-1" }]);
  const close = jest.fn().mockResolvedValue();

  beforeAll(async () => {
    CloudTasksClient.mockImplementation(() => ({
      queuePath,
      createTask,
      close
    }));
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      GCP_PROJECT_ID: "my-project",
      GCP_LOCATION: "asia-south1",
      CLOUD_TASKS_DEFAULT_QUEUE: "default-queue"
    });
    await fastify.register(cloudTaskPlugin);
    await fastify.ready();
  });

  afterAll(() => fastify.close());

  test("creates a delayed HTTP task on the default queue", async () => {
    const response = await fastify.createCloudTask({
      url: "https://example.com/callback",
      payload: { order_id: 1 },
      delayInSeconds: 30,
      logTrace: {}
    });

    expect(queuePath).toHaveBeenCalledWith(
      "my-project",
      "asia-south1",
      "default-queue"
    );
    const { parent, task } = createTask.mock.calls[0][0];
    expect(parent).toBe("projects/p/queues/q");
    expect(task.httpRequest).toEqual({
      httpMethod: "POST",
      url: "https://example.com/callback",
      body: Buffer.from(JSON.stringify({ order_id: 1 })).toString("base64"),
      headers: { "Content-Type": "application/json" }
    });
    expect(task.scheduleTime.seconds).toBeGreaterThan(Date.now() / 1000);
    expect(response).toEqual({ name: "task-1" });
  });

  test("uses the queue passed by the caller and omits the body without a payload", async () => {
    await fastify.createCloudTask({
      url: "https://example.com/ping",
      queue: "other-queue",
      httpMethod: "GET",
      logTrace: {}
    });

    expect(queuePath).toHaveBeenLastCalledWith(
      "my-project",
      "asia-south1",
      "other-queue"
    );
    const { task } = createTask.mock.calls[0][0];
    expect(task.httpRequest).toEqual({
      httpMethod: "GET",
      url: "https://example.com/ping"
    });
  });

  test("closes the Cloud Tasks client when the server closes", async () => {
    const closingFastify = Fastify({ logger: false });
    await closingFastify.register(cloudTaskPlugin);

    await closingFastify.close();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
