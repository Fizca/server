const config = require('config');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const AssetHandler = require('../services/asset-handler');
const S3 = require('../services/aws-s3');
const { AuthUser, AuthRole } = require('../services/middlewares');
const Asset = require('../models/asset');
const User = require('../models/user');
const Tag = require('../models/tag');
const Timeline = require('../models/timeline');

// Lambda's only writable directory is /tmp.
const upload = multer({ dest: '/tmp' });
const LIMIT = 10;

const router = express.Router();
router.use(AuthUser);

/**
 * Upload a number of images to the server
 */
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
]);
router.post('', AuthRole('contributor'), uploadFields, async (req, res, next) => {
  const { files: { image } } = req;
  const [{ originalname, path: filepath }] = image;

  try {
    const { profile, tags = [], moment } = req.body;

    const user = await User.findById(req.user.id);

    // Preprocess the file data
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

    Timeline.create({
      profile,
      asset,
      tags: tagObjs,
      takenAt: asset.takenAt,
    });

    res.json(asset);
  } catch (err) {
    next(err);
  } finally {
    // Lambda's /tmp is size-capped and shared across warm invocations; always remove the upload.
    fs.unlink(filepath, (unlinkErr) => {
      if (unlinkErr) {
        console.log(`Unable to delete ${filepath}`);
      }
    });
  }
});

/**
 * Get all assets stored in the database
 */
router.get('/profile/:profile', AuthRole('guest'), async (req, res) => {
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
router.get('/:id', AuthRole('guest'), async (req, res) => {
  const { id } = req.params;
  const asset = await Asset.findById(id);

  res.json(asset);
});

/**
 * Update an asset
 */
router.put('/:id', AuthRole('contributor'), async (req, res) => {
  const { id } = req.params;
  const {
    tags,
  } = req.body;

  // Find the asset
  const asset = await Asset.findById(id);

  // Update or create any tags.
  const tagObjs = await Tag.Upsert(tags, asset.profile);

  // Update the asset
  asset.tags = tagObjs;
  await asset.save();

  // Update the timeline with any required updates
  const options = { new: true, useFindAndModify: false };
  await Timeline.findOneAndUpdate(
    { asset: id },
    {
      tags: tagObjs,
    },
    options,
  );

  res.json(asset);
});

/**
 * Retrieve the image directly from S3
 */
router.get('/:size/:key', AuthRole('guest'), async (req, res) => {
  const { size, key } = req.params;

  S3.getObject(`${size}/${key}`, (err, data) => {
    if (err) {
      console.error(`Failed to fetch S3 object ${size}/${key}:`, err.message);
      res.sendStatus(500);
      return;
    }

    res.writeHead(200, { 'Content-Type': data.ContentType });
    res.write(data.Body, 'binary');
    res.end(null, 'binary');
  });
});

/**
 * Generate the signed url for S3 bucket for an asset.
 */
router.get('/url/:size/:key', AuthRole('guest'), async (req, res) => {
  const { size, key } = req.params;

  const image = await S3.getSignedUrl(`${size}/${key}`);

  res.send(image);
});

module.exports = router;
