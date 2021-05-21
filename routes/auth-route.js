const config = require('config');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

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
    const jwtToken = Authentication.GenerateAccessToken(user);
    res.status(201);
    res.json(jwtToken);
  }
});

router.get('/logout', Authentication.Logout);

module.exports = router;
