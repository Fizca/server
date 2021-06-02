const config = require('config');
const jwt = require('jsonwebtoken');
const AuthToken = require('../models/auth-token');
const { RoleCheck } = require('./user-roles');

const AuthUser = async (req, res, next) => {
  const token = req.headers.access_token;

  if (token == null) {
    res.sendStatus(401);
    return;
  }

  await jwt.verify(token, config.oauth.jwt.client_secret, async (err, data) => {
    if (err) {
      console.log(err);
      res.sendStatus(403);
      return;
    }

    const authToken = await AuthToken.findById(token);

    if (authToken) {
      res.sendStatus(403);
      return;
    }

    req.tokenData = data;
    next();
  });
};

const AuthRole = async (target) => (req, res, next) => {
  const { role } = req.tokenData;
  if (!RoleCheck(role, target)) {
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
  res.sendStatus(200);
  next();
};

module.export = {
  AuthRole,
  AuthUser,
  Logout,
};
