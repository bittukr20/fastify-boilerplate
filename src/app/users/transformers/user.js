// Pure data shaping between the API and the database. Called from services only.
function toUserInsertRow({ body }) {
  const { full_name, phone_number } = body;
  return { full_name, phone_number };
}

function toUserResponse({ user }) {
  return { user_id: user.id };
}

module.exports = { toUserInsertRow, toUserResponse };
