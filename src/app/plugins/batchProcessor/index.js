const fp = require("fastify-plugin");

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PROCESSING_INTERVAL_IN_MS = 5000;

function parsePubsubMessage({ message }) {
  return JSON.parse(Buffer.from(message.data, "base64").toString());
}

function createBatchProcessor({
  fastify,
  processBatchItems,
  batchSize = DEFAULT_BATCH_SIZE,
  processingIntervalInMs = DEFAULT_PROCESSING_INTERVAL_IN_MS
}) {
  const pendingItems = [];
  const state = { isProcessing: false, currentRun: null };

  async function runBatch({ itemsToProcess }) {
    try {
      await processBatchItems({ inputBatch: itemsToProcess });
    } catch (error) {
      fastify.log.error({ error, message: "Batch processing failed" });
    } finally {
      state.isProcessing = false;
    }
  }

  function processPendingItems() {
    if (state.isProcessing || pendingItems.length === 0)
      return state.currentRun;
    state.isProcessing = true;
    const itemsToProcess = pendingItems.splice(0, pendingItems.length);
    state.currentRun = runBatch({ itemsToProcess });
    return state.currentRun;
  }

  const timer = setInterval(processPendingItems, processingIntervalInMs);
  timer.unref();

  function addToBatch({ item }) {
    pendingItems.push(item);
    if (pendingItems.length >= batchSize) {
      processPendingItems();
    }
  }

  // Waits for the batch that is already running, then flushes what is still waiting.
  async function stop() {
    clearInterval(timer);
    await state.currentRun;
    await processPendingItems();
  }

  return { addToBatch, stop };
}

// Pub/Sub pull messages are parsed first and only acked after the batch succeeds.
function createPubsubPullBatchProcessor({ batchProcessorFunc, ...options }) {
  async function processMessages({ inputBatch: messages }) {
    const parsedMessages = messages.map(message =>
      parsePubsubMessage({ message })
    );
    await batchProcessorFunc({ inputBatch: parsedMessages });
    messages.forEach(message => message.ack());
  }
  return createBatchProcessor({
    ...options,
    processBatchItems: processMessages
  });
}

const batchProcessorPlugin = async fastify => {
  const createdProcessors = [];

  function keepTrackOf({ processor }) {
    createdProcessors.push(processor);
    return processor;
  }

  fastify.decorate(
    "createBatchProcessor",
    ({ batchProcessorFunc, ...options }) =>
      keepTrackOf({
        processor: createBatchProcessor({
          ...options,
          fastify,
          processBatchItems: batchProcessorFunc
        })
      })
  );
  fastify.decorate("createPubsubPullBatchProcessor", options =>
    keepTrackOf({
      processor: createPubsubPullBatchProcessor({ ...options, fastify })
    })
  );

  // On shutdown, no item that is still waiting in a batch is lost.
  fastify.addHook("onClose", async () => {
    await Promise.all(createdProcessors.map(processor => processor.stop()));
  });
};

module.exports = fp(batchProcessorPlugin);
