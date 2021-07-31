const AuthToken = require('../models/auth-token');
const User = require('../models/user');
const { RoleCheck } = require('./user-roles');

const AuthUser = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    res.sendStatus(401);
    return;
  }

  console.log(req.session);

  const { session: { user: { id } } } = req;
  const user = await User.findById(id);
  if (!user) {
    res.sendStatus(400);
    return;
  }

  req.user = user;
  next();
};

const AuthRole = (target) => (req, res, next) => {
  if (req.user && !RoleCheck(req.user.role, target)) {
    next();
    return;
  }

  const { role } = req.session.user;
  if (!RoleCheck(role, target)) {
    console.log(`Role mismatch. current: ${role}, target: ${target}`);
    res.sendStatus(403);
    return;
  }
  next();
};

const Logout = async (req, res, next) => {
  const token = req.headers.access_token;

  // Add the token to the expired list.
  const authToken = new AuthToken({ _id: token });
  authToken.save();

  req.session.destroy((err) => console.log(err));

  res.sendStatus(200);
  next();
};

module.exports = {
  AuthRole,
  AuthUser,
  Logout,
};
