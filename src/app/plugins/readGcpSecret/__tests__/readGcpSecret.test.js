const Fastify = require("fastify");
const NodeCache = require("node-cache");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const readGcpSecretPlugin = require("../index");

jest.mock("@google-cloud/secret-manager");

describe("readGcpSecret plugin", () => {
  let fastify;
  const close = jest.fn().mockResolvedValue();
  const accessSecretVersion = jest
    .fn()
    .mockResolvedValue([{ payload: { data: Buffer.from("s3cret") } }]);

  beforeAll(async () => {
    SecretManagerServiceClient.mockImplementation(() => ({
      accessSecretVersion,
      close
    }));
    fastify = Fastify({ logger: false });
    fastify.decorate("config", { GCP_PROJECT_ID: "my-project" });
    fastify.decorate("memCache", new NodeCache());
    await fastify.register(readGcpSecretPlugin);
    await fastify.ready();
  });

  afterAll(() => fastify.close());

  test("reads the latest secret version and caches it", async () => {
    const first = await fastify.readGcpSecret({ secretName: "signing-key" });
    const second = await fastify.readGcpSecret({ secretName: "signing-key" });

    expect(first).toBe("s3cret");
    expect(second).toBe("s3cret");
    expect(accessSecretVersion).toHaveBeenCalledTimes(1);
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: "projects/my-project/secrets/signing-key/versions/latest"
    });
  });

  test("closes the Secret Manager client when the server closes", async () => {
    const closingFastify = Fastify({ logger: false });
    await closingFastify.register(readGcpSecretPlugin);

    await closingFastify.close();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
