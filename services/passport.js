const passport = require('passport');
const { ExtractJwt, Strategy: JwtStrategy } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('config');
const JWT = require('jsonwebtoken');
const User = require('../models/user');

/**
 * JSON Web Token Strategy:
 */
const jwtStragety = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: config.jwt_secret,
  },
  async (payload, done) => {
    done(false, payload);
  },
);
passport.use(jwtStragety);

/**
 * Google OAuth 2.0 Strategy
 */
const googleStrategy = new GoogleStrategy(
  {
    clientID: config.oauth.google.client_id,
    clientSecret: config.oauth.google.client_secret,
    callbackURL: config.oauth.google.callback_url,
  },
  async (accessToken, refreshToken, profile, done) => {
    let user = await User.findOne({
      method: 'google',
      'google.id': profile.id,
    });
    if (user) {
      console.log(`user found in database: ${user.name()}`);
      done(false, user);
      return;
    }

    user = new User({
      method: 'google',
      google: {
        id: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
      },
    });
    user.save((err, model) => {
      if (err) {
        done(err, false);
        return;
      }
      console.log(`user created: ${model.name()}`);
    });
    done(false, user);
  },
);
passport.use('google', googleStrategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(false, user);
    })
    .catch((err) => {
      console.log('error:', err.message);
      done(new Error('Failed to deserialize an user'));
    });
});

passport.isAuthenticated = (req, res, next) => {
  if (!req.user) {
    console.log('Unauthorized request');
    res.sendStatus(403);
    return;
  }
  next();
};

module.exports = passport;
