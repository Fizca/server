const express = require('express');
const User = require('../models/user');
const { isAuthenticated } = require('../services/authentication');

const router = express.Router();

/**
 * Retrieve own account
 */
router.get('/me', isAuthenticated, async (req, res) => {
  const { userId } = req;
  const user = await User.findById(userId)
    .catch((e) => {
      console.log('error:', e.message);
      res.sendStatus(404);
    });
  res.json(user);
});

module.exports = router;