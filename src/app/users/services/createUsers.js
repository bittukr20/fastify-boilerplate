const userRepo = require("../repository/users");
const { toUserInsertRow, toUserResponse } = require("../transformers/user");

function createUsersService(fastify) {
  const { createUser } = userRepo(fastify);

  return async ({ body, logTrace }) => {
    const row = toUserInsertRow({ body });
    const user = await createUser.call(fastify.knex, { row, logTrace });
    return toUserResponse({ user });
  };
}

module.exports = createUsersService;
