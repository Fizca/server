const express = require('express');
const { AuthUser, AuthRole } = require('../services/middlewares');
const Vitals = require('../models/vitals');

const router = express.Router();

// Gate the entire route with authentication
router.use(AuthUser);

/**
 * Create a new vitals
 */
router.post('/', AuthRole('contributor'), async (req, res) => {
  const { id } = req.session.user;
  const vitalsData = req.body;

  const data = {
    ...vitalsData,
    user: id,
  };
  const vitals = new Vitals(data);
  await vitals.save();
  res.json(vitals);
});

/**
 * Get vitals
 */
router.get('/:id', AuthRole('guest'), async (req, res) => {
  const { id } = req.params;
  console.log(id);

  const vitals = await Vitals.findById(id)
    .catch((err) => {
      console.error('Entry not found: ', err.message);
      res.status(404);
    });

  return res.json(vitals);
});

/**
 * Update vitals
 */
router.put('/:id', AuthRole('contributor'), async (req, res) => {
  const { id } = req.params;
  const {
    weight, height, head, temp, takenAt,
  } = req.body;

  const update = {
    weight, height, head, temp, takenAt,
  };
  const options = { new: true, useFindAndModify: false };
  Vitals.findByIdAndUpdate(id, update, options)
    .then((model) => {
      console.log('Updated model:', JSON.stringify(model));
      res.json(model);
    })
    .catch((err) => {
      console.error('Unable to update entry: ', err.message);
      res.status(400);
    });
});

module.exports = router;
