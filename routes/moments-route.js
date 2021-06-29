const express = require('express');
const { AuthUser } = require('../services/middlewares');
const Moment = require('../models/moment');
const Tag = require('../models/tag');
const Timeline = require('../models/timeline');

const router = express.Router();

// Gate the entire route with authentication
router.use(AuthUser);

const LIMIT = 10;

/**
 * Create a new moment
 */
router.post('', async (req, res) => {
  const { tokenData } = req;
  const {
    title,
    text,
    profile,
    tags = [],
  } = req.body;

  // Process the tags
  const tagObjs = await Tag.Upsert(tags, profile);

  const moment = new Moment({
    title,
    text,
    profile,
    tags: tagObjs,
    user: tokenData.id,
  });
  await moment.save();

  Timeline.create({
    profile,
    moment,
    tags: tagObjs,
    takenAt: moment.takenAt,
  });

  res.json(moment);
});

/**
 * Update a moment
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    text, title, tags, takenAt,
  } = req.body;

  // Find the moment
  const moment = await Moment.findById(id);

  // Update or create any tags.
  const tagObjs = await Tag.Upsert(tags, moment.profile);

  // Update the moment
  moment.title = title;
  moment.text = text;
  moment.tags = tagObjs;
  moment.takenAt = takenAt;
  await moment.save();

  // Update the timeline with any required updates
  const options = { new: true, useFindAndModify: false };
  await Timeline.findOneAndUpdate(
    { moment: id },
    {
      tags: tagObjs,
      takenAt: moment.takenAt,
    },
    options,
  );

  res.json(moment);
});

/**
 * Get a moment
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const moment = await Moment.findById(id)
    .populate('assets')
    .populate('tags');

  res.json(moment);
});

/**
 * Retrieve all the moments for a profile
 */
router.get('/profile/:profile', async (req, res) => {
  const { profile } = req.params;
  const { page = 0 } = req.query;

  const moments = await Moment.find({ profile })
    .getPage(page, LIMIT)
    .populate('user', 'username')
    .populate('tags')
    .populate('assets');

  const count = await Moment.countDocuments({ profile });

  res.json({
    objects: moments,
    page,
    count,
    limit: LIMIT,
  });
});

module.exports = router;
