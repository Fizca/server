const express = require('express');
const { AuthUser } = require('../services/middlewares');
const Tag = require('../models/tag');

const router = express.Router();

/**
 * Get all tags stored in the database
 */
router.get('/list', AuthUser, async (req, res) => {
  const { profile } = req.query;
  const query = {};
  if (profile) {
    query.profile = profile;
  }
  const tags = await Tag.find(query);
  const count = await Tag.countDocuments(query);

  res.json({
    tags,
    count,
  });
});

module.exports = router;
