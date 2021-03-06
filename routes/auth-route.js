const config = require('config');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const { Logout } = require('../services/middlewares');
const Authentication = require('../services/authentication');

const client = new OAuth2Client(config.oauth.google.client_id);

const router = express.Router();

router.post('/google', async (req, res) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: config.oauth.google.client_id,
  });

  const user = await Authentication.GoogleUser(ticket.getPayload())
    .catch((e) => {
      console.log(e);
      res.status(403);
    });

  if (user) {
    req.session.user = {};
    req.session.user.id = user.id;
    req.session.user.role = user.role;

    res.status(201);
  }
  res.send();
});

router.get('/logout', Logout);

module.exports = router;
