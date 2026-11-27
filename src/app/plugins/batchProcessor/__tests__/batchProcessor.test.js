const Fastify = require("fastify");
const batchProcessorPlugin = require("../index");

const flushPromises = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });
const NEVER_ELAPSES_IN_MS = 60 * 60 * 1000;

describe("batchProcessor plugin", () => {
  let fastify;
  const processors = [];

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(batchProcessorPlugin);
    await fastify.ready();
  });

  afterAll(async () => {
    processors.forEach(processor => processor.stop());
    await fastify.close();
  });

  test("processes the batch as soon as the batch size is reached", async () => {
    const batchProcessorFunc = jest.fn().mockResolvedValue();
    const processor = fastify.createBatchProcessor({
      batchProcessorFunc,
      batchSize: 2,
      processingIntervalInMs: NEVER_ELAPSES_IN_MS
    });
    processors.push(processor);

    processor.addToBatch({ item: "first" });
    expect(batchProcessorFunc).not.toHaveBeenCalled();
    processor.addToBatch({ item: "second" });
    await flushPromises();

    expect(batchProcessorFunc).toHaveBeenCalledWith({
      inputBatch: ["first", "second"]
    });
  });

  test("parses pubsub messages and acks them after a successful batch", async () => {
    const batchProcessorFunc = jest.fn().mockResolvedValue();
    const processor = fastify.createPubsubPullBatchProcessor({
      batchProcessorFunc,
      batchSize: 1,
      processingIntervalInMs: NEVER_ELAPSES_IN_MS
    });
    processors.push(processor);
    const message = {
      data: Buffer.from(JSON.stringify({ order_id: 7 })).toString("base64"),
      ack: jest.fn()
    };

    processor.addToBatch({ item: message });
    await flushPromises();

    expect(batchProcessorFunc).toHaveBeenCalledWith({
      inputBatch: [{ order_id: 7 }]
    });
    expect(message.ack).toHaveBeenCalledTimes(1);
  });

  test("does not ack pubsub messages when the batch fails", async () => {
    const batchProcessorFunc = jest.fn().mockRejectedValue(new Error("boom"));
    const processor = fastify.createPubsubPullBatchProcessor({
      batchProcessorFunc,
      batchSize: 1,
      processingIntervalInMs: NEVER_ELAPSES_IN_MS
    });
    processors.push(processor);
    const message = {
      data: Buffer.from(JSON.stringify({ order_id: 8 })).toString("base64"),
      ack: jest.fn()
    };

    processor.addToBatch({ item: message });
    await flushPromises();

    expect(batchProcessorFunc).toHaveBeenCalledTimes(1);
    expect(message.ack).not.toHaveBeenCalled();
  });

  test("flushes items that are still waiting when the server closes", async () => {
    const closingFastify = Fastify({ logger: false });
    await closingFastify.register(batchProcessorPlugin);
    const batchProcessorFunc = jest.fn().mockResolvedValue();
    const processor = closingFastify.createBatchProcessor({
      batchProcessorFunc,
      batchSize: 100,
      processingIntervalInMs: NEVER_ELAPSES_IN_MS
    });

    processor.addToBatch({ item: "waiting-1" });
    processor.addToBatch({ item: "waiting-2" });
    expect(batchProcessorFunc).not.toHaveBeenCalled();
    await closingFastify.close();

    expect(batchProcessorFunc).toHaveBeenCalledWith({
      inputBatch: ["waiting-1", "waiting-2"]
    });
  });
});
