const fp = require("fastify-plugin");

function toCsvText({ value }) {
  const isEmpty = value === undefined || value === null;
  return isEmpty ? "" : String(value);
}

function escapeCsvValue({ value }) {
  const escapedText = toCsvText({ value }).replace(/"/g, '""');
  return `"${escapedText}"`;
}

function buildCsvRow({ values }) {
  const csvValues = values.map(value => escapeCsvValue({ value }));
  return `${csvValues.join(",")}\n`;
}

// Writes rows one at a time to a stream, so large exports never sit in memory.
function createCsvStreamWriter({ writeStream, columnNames }) {
  writeStream.write(buildCsvRow({ values: columnNames }));

  function writeRow({ item }) {
    if (!item) return false;
    const values = columnNames.map(columnName => item[columnName]);
    writeStream.write(buildCsvRow({ values }));
    return true;
  }

  return { writeRow };
}

const json2csvWriterPlugin = async fastify => {
  fastify.decorate("createCsvStreamWriter", createCsvStreamWriter);
};

module.exports = fp(json2csvWriterPlugin);
