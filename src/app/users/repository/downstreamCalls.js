const { DOWNSTREAM_SYSTEMS } = require("../../commons/constants");

function downstreamCallsRepo(fastify) {
  async function postToSomeOtherSystem({ input, logTrace }) {
    const response = await fastify.request({
      url: `${fastify.config.DOWNSTREAM_SYSTEM_URI}/v1/something`,
      method: "POST",
      headers: {
        ...logTrace
        // Add the Authorization header your downstream system expects
      },
      body: input,
      path: "/v1/something",
      downstream_system: DOWNSTREAM_SYSTEMS.SOME_SYSTEM,
      source_system: "user-service",
      domain: "user",
      functionality: "Post some data to the other system"
    });

    return response;
  }

  return {
    postToSomeOtherSystem
  };
}

module.exports = downstreamCallsRepo;
