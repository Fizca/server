const UserRoles = ['none', 'guest', 'contributor', 'admin'];

/**
 * Very simple system of priviledges. If the role is at least the
 * or higher, the action is allowed.
 * @param {*} role
 * @param {*} target
 * @returns True if allowed, otheriwse false.
 */
const RoleCheck = (role, target) => {
  const targetIndex = UserRoles.indexOf(target);
  const roleIndex = UserRoles.indexOf(target);
  return roleIndex >= targetIndex;
};

module.exports = {
  UserRoles,
  RoleCheck,
};
