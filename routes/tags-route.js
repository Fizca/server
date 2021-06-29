const express = require('express');
const { AuthUser } = require('../services/middlewares');
const Tag = require('../models/tag');
const Timeline = require('../models/timeline');

const router = express.Router();

const LIMIT = 10;

/**
 * Get all tags stored in the database
 */
router.get('/profile/:profile', AuthUser, async (req, res) => {
  const { profile } = req.params;
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

/**
 * Get all tags stored in the database
 */
router.get('/profile/:profile/:name', AuthUser, async (req, res) => {
  const { profile, name } = req.params;
  const { page = 0, limit = LIMIT } = req.query;

  const query = { profile, name };

  const tag = await Tag.findOne(query);
  console.log(tag);
  const timeline = await Timeline.find({ tags: { $in: [tag.id] } })
    .getPage(page, limit)
    .populate('moment')
    .populate('asset');

  console.log(timeline);
  const count = await Timeline.countDocuments(query);

  res.json({
    objects: timeline,
    page,
    count,
    limit: LIMIT,
  });
});

module.exports = router;
