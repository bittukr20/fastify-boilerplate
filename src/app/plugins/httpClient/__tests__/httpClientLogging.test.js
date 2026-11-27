const { Writable } = require("stream");
const Fastify = require("fastify");
const httpClientPlugin = require("../index");

// Collects everything Fastify writes to its logger, so we can search it for secrets.
function buildLogCollector() {
  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    }
  });
  return { stream, getOutput: () => lines.join("") };
}

describe("httpClient logging", () => {
  test("a failed downstream call never writes headers or body secrets to the logs", async () => {
    const { stream, getOutput } = buildLogCollector();
    const fastify = Fastify({ logger: { level: "info", stream } });
    await fastify.register(httpClientPlugin);
    await fastify.ready();

    // Port 9 is closed, so the call fails with ECONNREFUSED
    await expect(
      fastify.request({
        url: "http://127.0.0.1:9/login",
        path: "/login",
        method: "POST",
        body: { username: "asha", password: "hunter2" },
        headers: {
          Authorization: "Bearer SECRET-TOKEN",
          "x-api-key": "KEY-123"
        },
        downstream_system: "some-system",
        source_system: "user-service",
        domain: "user",
        functionality: "login"
      })
    ).rejects.toBeDefined();

    const output = getOutput();
    expect(output).toContain("ECONNREFUSED");
    expect(output).not.toContain("SECRET-TOKEN");
    expect(output).not.toContain("KEY-123");
    expect(output).not.toContain("hunter2");
    await fastify.close();
  });
});
