const express = require('express');
const { isAuthenticated } = require('../services/authentication');
const Profile = require('../models/profile');

const router = express.Router();

// Gate the entire route with authentication
router.use(isAuthenticated);

/**
 * Get all profiles stored in the database
 */
router.get('/list', async (req, res) => {
  const profiles = await Profile.find({});

  res.json(profiles);
});

/**
 * Create a new profile
 */
router.post('', async (req, res) => {
  const { name, birthday, nickname } = req.body;

  const profile = new Profile({ name, birthday, nickname });
  await profile.save();
  res.json(profile);
});

/**
 * Update a profile
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { birthday, nickname } = req.body;

  const update = { birthday, nickname };
  const options = { new: true, useFindAndModify: false };
  Profile.findByIdAndUpdate(id, update, options)
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
 * Retrieve a profile
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const profile = await Profile.findById(id);

  res.json(profile);
});

module.exports = router;
