const moment = require("moment-timezone");
const CustomError = require("../errorHandler/CustomError");

const TENANT_TIME_ZONES = {
  UTC: "UTC",
  INDIA: "Asia/Kolkata"
};
const LOCALE_DATE_TIME_FORMAT = "M/D/YYYY, h:mm:ss A";
const DATE_FORMAT = "YYYY-MM-DD";

function getTimeZoneByTenant({ tenant }) {
  const timeZone = TENANT_TIME_ZONES[tenant];
  if (!timeZone) {
    throw CustomError.create({
      httpCode: 400,
      message: `Unsupported tenant: ${tenant}`,
      property: "tenant",
      code: "INVALID_TENANT"
    });
  }
  return timeZone;
}

class DateTimeFormatter {
  constructor({ date, tenant }) {
    this.date = date;
    this.timeZone = getTimeZoneByTenant({ tenant });
  }

  getLocalDateTime() {
    return moment(this.date).tz(this.timeZone);
  }

  getLocaleDateTimeStr() {
    return this.getLocalDateTime().format(LOCALE_DATE_TIME_FORMAT);
  }

  formatYyyyMmDd() {
    return this.getLocalDateTime().format(DATE_FORMAT);
  }
}

module.exports = DateTimeFormatter;
