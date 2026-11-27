const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"];
const DEFAULT_SHUTDOWN_TIMEOUT_IN_MS = 25000;
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;

/**
 * Closes the server cleanly when the process is asked to stop.
 *
 * What happens on SIGTERM / SIGINT (and after an uncaught error):
 *   1. The server stops accepting new connections and waits for in-flight requests.
 *   2. Fastify runs every plugin's onClose hook (DB pool, clients, timers) in reverse order.
 *   3. The process exits. If closing takes longer than timeoutInMs it is forced to exit.
 */
function registerGracefulShutdown({
  fastify,
  processRef = process,
  timeoutInMs = DEFAULT_SHUTDOWN_TIMEOUT_IN_MS
}) {
  const state = { isShuttingDown: false };

  function startForceExitTimer() {
    const forceExitTimer = setTimeout(() => {
      fastify.log.error({
        message: "Graceful shutdown timed out, forcing exit",
        timeout_in_ms: timeoutInMs
      });
      processRef.exit(EXIT_CODE_FAILURE);
    }, timeoutInMs);
    forceExitTimer.unref();
    return forceExitTimer;
  }

  async function shutdown({ reason, exitCode = EXIT_CODE_SUCCESS }) {
    if (state.isShuttingDown) {
      fastify.log.warn({ message: "Shutdown already in progress", reason });
      return;
    }
    state.isShuttingDown = true;
    fastify.log.info({ message: "Shutting down gracefully", reason });
    const forceExitTimer = startForceExitTimer();

    try {
      await fastify.close();
      clearTimeout(forceExitTimer);
      fastify.log.info({ message: "Server closed gracefully" });
      processRef.exit(exitCode);
    } catch (error) {
      clearTimeout(forceExitTimer);
      fastify.log.error({ message: "Error while closing the server", error });
      processRef.exit(EXIT_CODE_FAILURE);
    }
  }

  function handleUnexpectedError({ reason, error }) {
    fastify.log.fatal({ message: "Unexpected error, shutting down", error });
    return shutdown({ reason, exitCode: EXIT_CODE_FAILURE });
  }

  SHUTDOWN_SIGNALS.forEach(signal => {
    processRef.on(signal, () => shutdown({ reason: signal }));
  });
  processRef.on("uncaughtException", error =>
    handleUnexpectedError({ reason: "uncaughtException", error })
  );
  processRef.on("unhandledRejection", error =>
    handleUnexpectedError({ reason: "unhandledRejection", error })
  );

  return { shutdown };
}

module.exports = { registerGracefulShutdown };
