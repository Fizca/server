const express = require('express');
const { AuthUser } = require('../services/middlewares');
const Moment = require('../models/moment');
const AssetHandler = require('../services/asset-handler');
const Tag = require('../models/tag');

const router = express.Router();

// Gate the entire route with authentication
router.use(AuthUser);

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
 * Retrieve all the moments for a profile
 */
router.get('/profile/:profile', async (req, res) => {
  const { profile } = req.params;
  const { include } = req.query;

  let db = Moment.find({ profile });
  if (include) {
    console.log('Populating fields:', include);
    db = db.populate(include);
  }
  const moments = await db;

  res.json(moments);
});

module.exports = router;
