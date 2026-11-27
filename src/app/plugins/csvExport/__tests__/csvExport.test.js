const Fastify = require("fastify");
const csvExportPlugin = require("../index");

describe("csvExport plugin", () => {
  let fastify;
  const save = jest.fn().mockResolvedValue();
  const file = jest.fn().mockReturnValue({ save });

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("cloudBucket", { name: "my-bucket", file });
    await fastify.register(csvExportPlugin);
    await fastify.ready();
  });

  afterAll(() => fastify.close());

  test("converts JSON rows to CSV text", () => {
    const csv = fastify.convertJSONToCsv({
      inputData: [{ sku_code: "A1", price: 10 }]
    });

    expect(csv).toBe('"sku_code","price"\n"A1",10');
  });

  test("applies custom column labels", () => {
    const csv = fastify.convertJSONToCsv({
      inputData: [{ sku_code: "A1" }],
      parserOptions: { fields: [{ label: "SKU Code", value: "sku_code" }] }
    });

    expect(csv).toBe('"SKU Code"\n"A1"');
  });

  test("uploads the CSV to the bucket and returns where it was saved", async () => {
    const result = await fastify.uploadCsvToBucket({
      inputData: [{ sku_code: "A1" }],
      fileName: "price-report",
      logTrace: {}
    });

    expect(file).toHaveBeenCalledWith("price-report.csv");
    expect(save).toHaveBeenCalledWith('"sku_code"\n"A1"', {
      contentType: "text/csv"
    });
    expect(result).toEqual({
      bucket_name: "my-bucket",
      file_name: "price-report.csv"
    });
  });
});
