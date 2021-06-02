const config = require('config');
const jwt = require('jsonwebtoken');

const AuthToken = require('../models/auth-token');
const User = require('../models/user');
const { RoleCheck } = require('./user-roles');

class Authentication {
  static GenerateAccessToken(user) {
    const tokenData = {
      id: user.id,
      role: user.role,
    };
    return jwt.sign(tokenData, config.oauth.jwt.client_secret, { expiresIn: '24h' });
  }

  static async GoogleUser(data) {
    const {
      name, email, picture, sub,
    } = data;

    let user = await User.findOne({
      method: 'google',
      'google.id': sub,
    });

    if (user && !user.avatar) {
      user.avatar = picture;
      await user.save();
    }

    if (!user) {
      user = new User({
        method: 'google',
        username: name,
        avatar: picture,
        google: {
          id: sub,
          email,
          displayName: name,
        },
      });
      user.save();
      console.log(`user created: ${user.name()}`);
    }

    return user;
  }
}

module.exports = Authentication;
