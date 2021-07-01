const config = require('config');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const { Logout } = require('../services/middlewares');
const Authentication = require('../services/authentication');
const awsS3 = require('../services/aws-s3');

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
    const cookie = await awsS3.generateCookies();
    console.log('cookie', cookie);

    Object.entries(cookie).forEach(([key, value]) => {
      console.log(key, value);
      res.cookie(key, value, {
        path: '/',
        domain: '.cloudfront.net',
        // sameSite: false,
      });
      console.log(res.cookies);
    });
    res.cookie('test-abc', 'hello');

    const jwtToken = Authentication.GenerateAccessToken(user);
    res.status(201);
    res.json(jwtToken);
  }
});

router.get('/logout', Logout);

module.exports = router;
