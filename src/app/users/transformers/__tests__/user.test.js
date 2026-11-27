const { toUserInsertRow, toUserResponse } = require("../user");

describe("user transformers", () => {
  test("toUserInsertRow keeps only the columns that can be inserted", () => {
    const body = {
      full_name: "some kumar some",
      phone_number: { country_code: "+91", number: "8109810909" },
      unexpected_field: "ignored"
    };

    expect(toUserInsertRow({ body })).toEqual({
      full_name: "some kumar some",
      phone_number: { country_code: "+91", number: "8109810909" }
    });
  });

  test("toUserResponse maps the database id to user_id", () => {
    expect(toUserResponse({ user: { id: "some uuid" } })).toEqual({
      user_id: "some uuid"
    });
  });
});
