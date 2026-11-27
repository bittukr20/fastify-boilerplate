const { logQuery } = require("../../commons/helpers");
const { USER } = require("../commons/models");

function userRepo(fastify) {
  async function createUser({ row, logTrace }) {
    const knex = this;
    const query = knex(USER.NAME).returning("*").insert(row);
    logQuery({
      logger: fastify.log,
      query,
      context: "Create User",
      logTrace
    });
    const response = await query;
    return response[0];
  }

  return {
    createUser
  };
}

module.exports = userRepo;
