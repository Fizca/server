const express = require('express');
const multer = require('multer');
const { isAuthenticated } = require('../services/authentication');
const Moment = require('../models/moment');
const AssetHandler = require('../services/asset-handler');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Gate the entire route with authentication
router.use(isAuthenticated);

/**
 * Create a new moment
 */
router.post('', upload.array('images', AssetHandler.MaximumImageCount), async (req, res) => {
  const {
    title,
    text,
    profile,
  } = req.body;
  const { files = [], tokenData: { id } } = req;

  const assets = await AssetHandler.CreateMultipleImages(files, id);

  const moment = new Moment({
    title,
    text,
    assets,
    profile,
    user: id,
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
