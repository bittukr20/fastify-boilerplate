const { create, start } = require("../index");
const { registerGracefulShutdown } = require("../app/commons/gracefulShutdown");

jest.mock("fastify", () => () => ({
  setErrorHandler: jest.fn().mockReturnValue(true),
  register: jest.fn().mockResolvedValue(true),
  addHook: jest.fn().mockReturnValue(true),
  ready: jest.fn().mockReturnValue(true),
  close: jest.fn().mockReturnValue(true),
  config: { SHUTDOWN_TIMEOUT_IN_MS: 1234 },
  listen: jest.fn((_, callback) => callback(false, "00"))
}));

jest.mock("knex", () => () => ({}));
jest.mock("../app/commons/gracefulShutdown");
jest.mock("../app/commons/helpers", () => ({
  connectionCheck: jest.fn().mockResolvedValue()
}));

let fastify;

describe("create server", () => {
  beforeAll(async () => {
    fastify = await create();
    await fastify.ready();
  });

  it("should create server", () => {
    expect(fastify).toBeDefined();
  });

  afterAll(() => {
    fastify.close();
    jest.clearAllMocks();
  });
});

describe("Start server", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("should create server and log", async () => {
    await start();
    expect(registerGracefulShutdown).toHaveBeenCalledWith({
      fastify: expect.any(Object),
      timeoutInMs: 1234
    });
  });
});
