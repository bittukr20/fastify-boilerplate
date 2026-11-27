const { EventEmitter } = require("events");
const { registerGracefulShutdown } = require("../gracefulShutdown");

const flushPromises = () =>
  new Promise(resolve => {
    setImmediate(resolve);
  });

function buildFastify({ close }) {
  return {
    close,
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    }
  };
}

function buildProcessRef() {
  const processRef = new EventEmitter();
  processRef.exit = jest.fn();
  return processRef;
}

describe("registerGracefulShutdown", () => {
  test.each(["SIGTERM", "SIGINT"])(
    "closes the server and exits with 0 on %s",
    async signal => {
      const fastify = buildFastify({ close: jest.fn().mockResolvedValue() });
      const processRef = buildProcessRef();
      registerGracefulShutdown({ fastify, processRef });

      processRef.emit(signal);
      await flushPromises();

      expect(fastify.close).toHaveBeenCalledTimes(1);
      expect(processRef.exit).toHaveBeenCalledWith(0);
    }
  );

  test("exits with 1 when closing the server fails", async () => {
    const fastify = buildFastify({
      close: jest.fn().mockRejectedValue(new Error("pool is stuck"))
    });
    const processRef = buildProcessRef();
    registerGracefulShutdown({ fastify, processRef });

    processRef.emit("SIGTERM");
    await flushPromises();

    expect(fastify.log.error).toHaveBeenCalled();
    expect(processRef.exit).toHaveBeenCalledWith(1);
  });

  test("ignores a second signal while shutting down", async () => {
    const fastify = buildFastify({ close: jest.fn().mockResolvedValue() });
    const processRef = buildProcessRef();
    registerGracefulShutdown({ fastify, processRef });

    processRef.emit("SIGTERM");
    processRef.emit("SIGINT");
    await flushPromises();

    expect(fastify.close).toHaveBeenCalledTimes(1);
    expect(processRef.exit).toHaveBeenCalledTimes(1);
    expect(fastify.log.warn).toHaveBeenCalledTimes(1);
  });

  test.each(["uncaughtException", "unhandledRejection"])(
    "closes the server and exits with 1 on %s",
    async eventName => {
      const fastify = buildFastify({ close: jest.fn().mockResolvedValue() });
      const processRef = buildProcessRef();
      registerGracefulShutdown({ fastify, processRef });

      processRef.emit(eventName, new Error("something broke"));
      await flushPromises();

      expect(fastify.log.fatal).toHaveBeenCalledTimes(1);
      expect(fastify.close).toHaveBeenCalledTimes(1);
      expect(processRef.exit).toHaveBeenCalledWith(1);
    }
  );

  test("forces the process to exit when closing takes too long", async () => {
    jest.useFakeTimers();
    try {
      const fastify = buildFastify({
        close: jest.fn(() => new Promise(() => {}))
      });
      const processRef = buildProcessRef();
      registerGracefulShutdown({ fastify, processRef, timeoutInMs: 5000 });

      processRef.emit("SIGTERM");
      expect(processRef.exit).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5000);

      expect(processRef.exit).toHaveBeenCalledWith(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
