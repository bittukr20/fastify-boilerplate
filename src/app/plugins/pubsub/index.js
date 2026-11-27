const { v4: uuidv4 } = require("uuid");
const fp = require("fastify-plugin");
const moment = require("moment-timezone");
const { PubSub } = require("@google-cloud/pubsub");

const DEFAULT_EVENT_VERSION = "1.0";
const EVENT_MIME_TYPE = "application/json";

function createEvent({ data, entity_type, event_type, version }) {
  const now = moment().utc();
  return {
    eventAttributes: {
      event_id: uuidv4(),
      event_type,
      entity_type,
      timestamp: String(now.valueOf()),
      datetime: now.toISOString(),
      mime_type: EVENT_MIME_TYPE,
      version
    },
    eventData: Buffer.from(JSON.stringify(data))
  };
}

const publishEventWrapper = ({ fastify, pubSubClient }) => {
  async function publishMessage({ eventData, eventAttributes, topic_name }) {
    const messageId = await pubSubClient
      .topic(topic_name)
      .publishMessage({ data: eventData, attributes: eventAttributes });
    return { messageId };
  }

  // Publishing never throws: callers get true/false and the failure is logged.
  return async ({
    data,
    event_info,
    version = DEFAULT_EVENT_VERSION,
    logTrace
  }) => {
    const { entity_type, event_type, topic_name } = event_info;
    const { eventData, eventAttributes } = createEvent({
      data,
      entity_type,
      event_type,
      version
    });
    try {
      const { messageId } = await publishMessage({
        eventData,
        eventAttributes,
        topic_name
      });
      fastify.log.info({
        event_info,
        message: "Event publish completed",
        messageId,
        data,
        logTrace
      });
      return true;
    } catch (err) {
      fastify.log.error({
        event_info,
        data,
        err,
        message: "Publish message failed",
        logTrace
      });
      return false;
    }
  };
};

function parseEvent(fastify) {
  return ({ event }) => {
    const { message } = event;

    fastify.log.info({ message: "Raw Pubsub Message", data: message });

    const { data, attributes } = message;
    try {
      const parsedMessage = JSON.parse(Buffer.from(data, "base64").toString());
      fastify.log.info({
        message: "Parsed Pubsub Message",
        data: { parsedMessage, attributes }
      });
      return {
        payload: parsedMessage,
        attributes
      };
    } catch (err) {
      fastify.log.error({ message: "Error in parsing PubSub Message" });
      throw err;
    }
  };
}

const eventPlugin = async fastify => {
  const pubSubClient = new PubSub();
  fastify.decorate(
    "publishEvent",
    publishEventWrapper({ fastify, pubSubClient })
  );
  fastify.decorate("parseEvent", parseEvent(fastify));
  // close() flushes messages that are still waiting to be published
  fastify.addHook("onClose", async () => {
    await pubSubClient.close();
  });
};

module.exports = fp(eventPlugin);
