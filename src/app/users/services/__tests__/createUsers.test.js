const createUserService = require("../createUsers");
const userRepo = require("../../repository/users");

jest.mock("../../repository/users");

describe("createUsers service", () => {
  test("transforms the body, saves the user and returns the response shape", async () => {
    const createUser = jest.fn().mockResolvedValue({ id: "some uuid" });
    userRepo.mockReturnValue({ createUser });
    const knex = {};
    const createUsers = createUserService({ knex });

    const response = await createUsers({
      body: {
        full_name: "some kumar some",
        phone_number: { country_code: "+91", number: "8109810909" }
      },
      logTrace: { "x-request-id": "abc" }
    });

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser.mock.contexts[0]).toBe(knex);
    expect(createUser.mock.calls[0][0]).toEqual({
      row: {
        full_name: "some kumar some",
        phone_number: { country_code: "+91", number: "8109810909" }
      },
      logTrace: { "x-request-id": "abc" }
    });
    expect(response).toEqual({ user_id: "some uuid" });
  });
});
