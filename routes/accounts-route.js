const express = require('express');

const router = express.Router();

/**
 * Retrieve own account
 */
router.get('', async (req, res) => {
  const { user } = req;
  res.json(user);
});

module.exports = router;
