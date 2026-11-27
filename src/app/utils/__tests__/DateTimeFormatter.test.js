const DateTimeFormatter = require("../DateTimeFormatter");

describe("DateTimeFormatter", () => {
  // 2024-01-31 20:00 UTC is already 2024-02-01 01:30 in India (UTC+5:30)
  const date = "2024-01-31T20:00:00.000Z";

  test("formats the date in UTC", () => {
    const formatter = new DateTimeFormatter({ date, tenant: "UTC" });
    expect(formatter.formatYyyyMmDd()).toBe("2024-01-31");
    expect(formatter.getLocaleDateTimeStr()).toBe("1/31/2024, 8:00:00 PM");
  });

  test("formats the date in the INDIA time zone", () => {
    const formatter = new DateTimeFormatter({ date, tenant: "INDIA" });
    expect(formatter.formatYyyyMmDd()).toBe("2024-02-01");
    expect(formatter.getLocaleDateTimeStr()).toBe("2/1/2024, 1:30:00 AM");
  });

  test("throws a 400 error for an unsupported tenant", () => {
    expect(() => new DateTimeFormatter({ date, tenant: "MARS" })).toThrow();
    try {
      // eslint-disable-next-line no-new
      new DateTimeFormatter({ date, tenant: "MARS" });
    } catch (error) {
      expect(error.code).toBe(400);
      expect(error.response.errors[0].code).toBe("INVALID_TENANT");
    }
  });
});
