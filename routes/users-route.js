const express = require('express');
const passport = require('../services/passport');

const router = express.Router();

/**
 * Retrieve own account
 */
router.get('/me', passport.isAuthenticated, async (req, res) => {
  const { user } = req;
  res.json(user);
});

module.exports = router;
