const Fastify = require("fastify");
const { PubSub } = require("@google-cloud/pubsub");
const pubsubPlugin = require("../index");

jest.mock("@google-cloud/pubsub");

describe("pubsub plugin", () => {
  let fastify;
  const publishMessage = jest.fn();
  const close = jest.fn().mockResolvedValue();
  const topic = jest.fn().mockReturnValue({ publishMessage });
  const eventInfo = {
    entity_type: "USER",
    event_type: "USER_CREATED",
    topic_name: "user-events"
  };

  beforeAll(async () => {
    PubSub.mockImplementation(() => ({ topic, close }));
    fastify = Fastify({ logger: false });
    await fastify.register(pubsubPlugin);
    await fastify.ready();
  });

  afterAll(() => fastify.close());

  test("publishes the event with generated attributes and returns true", async () => {
    publishMessage.mockResolvedValueOnce("message-1");

    const isPublished = await fastify.publishEvent({
      data: { user_id: "u1" },
      event_info: eventInfo,
      logTrace: {}
    });

    expect(isPublished).toBe(true);
    expect(topic).toHaveBeenCalledWith("user-events");
    const { data, attributes } = publishMessage.mock.calls[0][0];
    expect(JSON.parse(data.toString())).toEqual({ user_id: "u1" });
    expect(attributes).toMatchObject({
      entity_type: "USER",
      event_type: "USER_CREATED",
      mime_type: "application/json",
      version: "1.0"
    });
    expect(attributes.event_id).toEqual(expect.any(String));
    expect(attributes.datetime).toMatch(/Z$/);
  });

  test("returns false instead of throwing when publishing fails", async () => {
    publishMessage.mockRejectedValueOnce(new Error("pubsub down"));

    const isPublished = await fastify.publishEvent({
      data: {},
      event_info: eventInfo,
      logTrace: {}
    });

    expect(isPublished).toBe(false);
  });

  test("closes the pub/sub client when the server closes", async () => {
    const closingFastify = Fastify({ logger: false });
    await closingFastify.register(pubsubPlugin);

    await closingFastify.close();

    expect(close).toHaveBeenCalledTimes(1);
  });

  test("parses a pubsub push message", () => {
    const event = {
      message: {
        data: Buffer.from(JSON.stringify({ user_id: "u1" })).toString("base64"),
        attributes: { event_type: "USER_CREATED" }
      }
    };

    expect(fastify.parseEvent({ event })).toEqual({
      payload: { user_id: "u1" },
      attributes: { event_type: "USER_CREATED" }
    });
  });

  test("throws when the message data is not valid JSON", () => {
    const event = {
      message: { data: Buffer.from("not json").toString("base64") }
    };

    expect(() => fastify.parseEvent({ event })).toThrow();
  });
});
