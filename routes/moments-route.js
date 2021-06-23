const express = require('express');
const { AuthUser } = require('../services/middlewares');
const Moment = require('../models/moment');
const Tag = require('../models/tag');

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
  res.json(moment);
});

/**
 * Update a moment
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { text, title, vitals } = req.body;

  const update = { text, title, vitals };
  const options = { new: true, useFindAndModify: false };
  Moment.findByIdAndUpdate(id, update, options)
    .then((model) => {
      console.log('Updated model:', JSON.stringify(model));
      res.json(model);
    })
    .catch((err) => {
      console.error('Unable to update entry: ', err.message);
      res.status(400);
    });
});

/**
 * Update a moment
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { text, title, vitals } = req.body;

  const update = { text, title, vitals };
  const options = { new: true, useFindAndModify: false };
  Moment.findByIdAndUpdate(id, update, options)
    .then((model) => {
      console.log('Updated model:', JSON.stringify(model));
      res.json(model);
    })
    .catch((err) => {
      console.error('Unable to update entry: ', err.message);
      res.status(400);
    });
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
