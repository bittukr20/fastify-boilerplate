const Fastify = require("fastify");
const json2csvWriterPlugin = require("../index");

describe("json2csvWriter plugin", () => {
  let fastify;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(json2csvWriterPlugin);
    await fastify.ready();
  });

  afterAll(() => fastify.close());

  test("writes the header first, then one quoted row per item", () => {
    const writeStream = { write: jest.fn() };
    const { writeRow } = fastify.createCsvStreamWriter({
      writeStream,
      columnNames: ["sku_code", "price"]
    });

    const isWritten = writeRow({ item: { sku_code: "A1", price: 10 } });

    expect(isWritten).toBe(true);
    expect(writeStream.write).toHaveBeenNthCalledWith(
      1,
      '"sku_code","price"\n'
    );
    expect(writeStream.write).toHaveBeenNthCalledWith(2, '"A1","10"\n');
  });

  test("escapes double quotes and writes empty values as empty strings", () => {
    const writeStream = { write: jest.fn() };
    const { writeRow } = fastify.createCsvStreamWriter({
      writeStream,
      columnNames: ["title", "note"]
    });

    writeRow({ item: { title: 'The "best" one', note: null } });

    expect(writeStream.write).toHaveBeenLastCalledWith(
      '"The ""best"" one",""\n'
    );
  });

  test("skips empty items", () => {
    const writeStream = { write: jest.fn() };
    const { writeRow } = fastify.createCsvStreamWriter({
      writeStream,
      columnNames: ["title"]
    });

    expect(writeRow({ item: undefined })).toBe(false);
    expect(writeStream.write).toHaveBeenCalledTimes(1);
  });
});
