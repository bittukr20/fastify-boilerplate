const fp = require("fastify-plugin");
const { Parser } = require("@json2csv/plainjs");

const CSV_CONTENT_TYPE = "text/csv";

// Requires the cloudBucket plugin to be registered first (for uploads).
const csvExportPlugin = async fastify => {
  function convertJSONToCsv({ inputData, parserOptions = {} }) {
    const csvParser = new Parser(parserOptions);
    return csvParser.parse(inputData);
  }

  async function uploadCsvToBucket({
    inputData,
    fileName,
    parserOptions,
    logTrace
  }) {
    const csvData = convertJSONToCsv({ inputData, parserOptions });
    const objectName = `${fileName}.csv`;
    await fastify.cloudBucket
      .file(objectName)
      .save(csvData, { contentType: CSV_CONTENT_TYPE });

    fastify.log.info({
      message: "CSV file uploaded to bucket",
      log_trace: logTrace,
      file_name: objectName
    });
    return { bucket_name: fastify.cloudBucket.name, file_name: objectName };
  }

  fastify.decorate("convertJSONToCsv", convertJSONToCsv);
  fastify.decorate("uploadCsvToBucket", uploadCsvToBucket);
};

module.exports = fp(csvExportPlugin);
