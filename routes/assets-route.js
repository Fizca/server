const config = require('config');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const AssetHandler = require('../services/asset-handler');
const S3 = require('../services/aws-s3');
const { AuthUser } = require('../services/middlewares');
const Asset = require('../models/asset');
const User = require('../models/user');
const Tag = require('../models/tag');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

const LIMIT = 10;

/**
 * Upload a number of images to the server
 */
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'profile' },
  { name: 'tags' },
]);
router.post('', AuthUser, uploadFields, async (req, res) => {
  const { files: { image }, tokenData } = req;
  const { profile, tags = [], moment } = req.body;
  const user = await User.findById(tokenData.id);

  // Preprocess the file data
  const [{ originalname, path: filepath }] = image;
  const metadata = await AssetHandler.ExtractMetadata(filepath);
  const name = AssetHandler.HashFileName(originalname, user.id);

  // Iterate through all the options, generate the resized images
  // and upload each image to S3
  const assetConfigs = config.assets;
  const promises = assetConfigs.map(async (options) => {
    const { bucket } = options;
    const buffer = await AssetHandler.Resizer(filepath, options);
    return S3.putObject(buffer, `${bucket}/${name}`);
  });
  await Promise.all(promises);
  console.log(`Successfully uploaded image: ${name}`);

  // Clean up
  fs.unlink(filepath, (err) => {
    if (err) {
      console.log(`Unable to delete ${filepath}`);
    }
  });

  // Process the tags
  const tagObjs = await Tag.Upsert(tags, profile);

  // Create and save the asset
  const asset = new Asset({
    name,
    type: 'image',
    user,
    profile,
    moment,
    takenAt: metadata.createdAt || Date.now(),
    metadata: {
      latitude: metadata.latitude,
      longitude: metadata.longitude,
    },
    tags: tagObjs,
  });
  await asset.save();

  res.json(asset);
});

/**
 * Get all assets stored in the database
 */
router.get('/profile/:profile', AuthUser, async (req, res) => {
  const { profile } = req.params;
  const { page = 0 } = req.query;
  const query = {};
  if (profile) {
    query.profile = profile;
  }
  const assets = await Asset.find(query)
    .getPage(page, LIMIT)
    .populate('user', 'username');

  const count = await Asset.countDocuments(query);

  res.json({
    objects: assets,
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
router.get('/url/:size/:key', AuthUser, async (req, res) => {
  const { size, key } = req.params;

  const image = await S3.getSignedUrl(`${size}/${key}`);

  res.send(image);
});

module.exports = router;
