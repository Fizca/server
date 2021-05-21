const config = require('config');
const jwt = require('jsonwebtoken');

const Blackball = require('../models/blackball');
const User = require('../models/user');

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

    if (user && user.google.avatar !== picture) {
      user.google.avatar = picture;
      await user.save();
    }

    if (!user) {
      user = new User({
        method: 'google',
        google: {
          id: sub,
          email,
          displayName: name,
          avatar: picture,
        },
      });
      user.save();
      console.log(`user created: ${user.name()}`);
    }

    return user;
  }

  static async isAuthenticated(req, res, next) {
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

      const blackball = await Blackball.findById(token);

      if (blackball) {
        res.sendStatus(403);
        return;
      }

      req.tokenData = data;
      next();
    });
  }

  static async AuthRole(roles) {
    return [
      Authentication.isAuthenticated,
      (req, res, next) => {
        const { role } = req.tokenData;
        if (!roles.includes(role)) {
          res.sendStatus(403);
          return;
        }
        next();
      },
    ];
  }

  static async Logout(req, res, next) {
    const token = req.headers.access_token;

    // Add the token to the blackball list.
    const blackball = new Blackball({ _id: token });
    blackball.save();
    res.sendStatus(200);
    next();
  }
}

module.exports = Authentication;
