const Fastify = require("fastify");
const knex = require("knex");
const { connectionCheck } = require("../../../commons/helpers");
const knexPlugin = require("../index");

jest.mock("knex");
jest.mock("../paginator");
jest.mock("../../../commons/helpers", () => ({
  connectionCheck: jest.fn()
}));

describe("knex plugin", () => {
  const destroy = jest.fn().mockResolvedValue();

  beforeEach(() => {
    knex.mockReturnValue({ destroy });
    connectionCheck.mockResolvedValue();
  });

  test("decorates fastify with the knex instance", async () => {
    const fastify = Fastify({ logger: false });

    await fastify.register(knexPlugin, { client: "postgres" });
    await fastify.ready();

    expect(knex).toHaveBeenCalledWith({ client: "postgres" });
    expect(fastify.knex).toBeDefined();
    await fastify.close();
  });

  test("destroys the connection pool when the server closes", async () => {
    const fastify = Fastify({ logger: false });
    await fastify.register(knexPlugin, {});
    await fastify.ready();

    await fastify.close();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test("fails to start when the database is not reachable", async () => {
    connectionCheck.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const fastify = Fastify({ logger: false });

    await expect(fastify.register(knexPlugin, {})).rejects.toThrow(
      /Connection Failed/
    );
  });
});
