const path = require("path");
const dotenv = require("dotenv");

// override: true makes sure a developer's own .env can never point the tests at another database
dotenv.config({
  path: path.join(__dirname, "..", ".test.env"),
  override: true
});
