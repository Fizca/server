const express = require('express');
const multer = require('multer');
const AssetHandler = require('../services/asset-handler');
const S3 = require('../services/aws-s3');
const { AuthUser } = require('../services/middlewares');
const Asset = require('../models/asset');
const User = require('../models/user');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

const MAX_IMAGE_COUNT = 13;
const LIMIT = 10;

/**
 * Upload a number of images to the server
 */
router.post('', AuthUser, upload.array('images', MAX_IMAGE_COUNT), async (req, res) => {
  const { files, tokenData } = req;
  const user = await User.findById(tokenData.id);

  const assets = await AssetHandler.CreateMultipleImages(files, user);
  res.json(assets);
});

/**
 * Get all assets stored in the database
 */
router.get('/list', AuthUser, async (req, res) => {
  const { page = 0, profile } = req.query;
  const query = {};
  if (profile) {
    query.profile = profile;
  }
  const assets = await Asset.find(query)
    .getPage(page, LIMIT)
    .populate('user', 'username');

  const count = await Asset.countDocuments(query);

  res.json({
    assets,
    page,
    count,
    limit: LIMIT,
  });
});

/**
 * Get all assets stored in the database for a given profile
 */
router.get('/profile/:profile', AuthUser, async (req, res) => {
  const { page = 0 } = req.query;
  const { profile } = req.params;
  const query = { profile };
  const assets = await Asset.find(query)
    .getPage(page, LIMIT)
    .populate('user', 'username');
  const count = await Asset.countDocuments(query);

  res.json({
    assets,
    page,
    count,
    limit: LIMIT,
  });
});

/**
 * Get an specific asset from the database
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const asset = await Asset.findById(id);

  res.json(asset);
});

/**
 * Generate the signed url for S3 bucket for an asset.
 */
router.get('/url/:key', AuthUser, async (req, res) => {
  const { key } = req.params;

  const image = await S3.getSignedUrl(key);

  res.send(image);
});

module.exports = router;
