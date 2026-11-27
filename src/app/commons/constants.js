const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const DOWNSTREAM_SYSTEMS = {
  SOME_SYSTEM: "some-system-name"
};

// Keys whose values are never written to the logs. Compared in lower case.
const SENSITIVE_KEYS = [
  "password",
  "new_password",
  "newpassword",
  "current_password",
  "currentpassword",
  "confirm_password",
  "confirmpassword",
  "otp",
  "pin",
  "token",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "id_token",
  "secret",
  "client_secret",
  "api_key",
  "apikey",
  "x-api-key",
  "authorization",
  "cookie",
  "set-cookie"
];

const REDACTED_VALUE = "****";

module.exports = {
  DEFAULT_TIME_ZONE,
  DOWNSTREAM_SYSTEMS,
  SENSITIVE_KEYS,
  REDACTED_VALUE
};
