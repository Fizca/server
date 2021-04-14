const config = require('config');
const express = require('express');
const passport = require('../services/passport');

const redirectUrl = config.oauth.google.redirect_url;

const router = express.Router();

router.get('/oauth', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/callback', passport.authenticate('google', { session: true, successRedirect: redirectUrl }));

module.exports = router;
