module.exports = {
  testEnvironment: "node",
  clearMocks: true,
  testMatch: ["<rootDir>/tests/e2e/**/*.e2e.test.js"],
  // Loads tests/.test.env before any test file runs
  setupFiles: ["<rootDir>/tests/e2e/setupEnv.js"],
  // Runs the migrations once, before the first test file
  globalSetup: "<rootDir>/tests/e2e/globalSetup.js",
  // Test files share one database and each one seeds and tears it down,
  // so they run one after another (like the Go E2E packages)
  maxWorkers: 1,
  testTimeout: 30000
};
