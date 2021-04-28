const express = require('express');
const multer = require('multer');
const AssetHandler = require('../services/asset-handler');
const S3 = require('../services/aws-s3');
const { isAuthenticated } = require('../services/authentication');
const Asset = require('../models/asset');
const User = require('../models/user');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

const MAX_IMAGE_COUNT = 13;

/**
 * Upload a number of images to the server
 */
router.post('', isAuthenticated, upload.array('images', MAX_IMAGE_COUNT), async (req, res) => {
  const { files, userId } = req;
  const user = await User.findById(userId);

  const assets = await AssetHandler.CreateMultipleImages(files, user);
  res.json(assets);
});

/**
 * Get all assets stored in the database
 */
router.get('/list', isAuthenticated, async (req, res) => {
  const assets = await Asset.find({});

  res.json(assets);
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
router.get('/url/:key', isAuthenticated, async (req, res) => {
  const { key } = req.params;

  const image = await S3.getSignedUrl(key);

  res.send(image);
});

module.exports = router;
