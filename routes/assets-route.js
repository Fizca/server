const fs = require('fs');
const express = require('express');
const multer = require('multer');
const AssetHandler = require('../services/asset-handler');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

const MAX_IMAGE_COUNT = 13;

/**
 * Upload a number of images to the server
 */
router.post('', upload.array('images', MAX_IMAGE_COUNT), async (req, res) => {
  const { files } = req;

  const promises = await files.map(async (file) => {
    await AssetHandler.CreateImage(file)
      .catch((err) => {
        console.log('Unable to upload image to S3', err.message);
        return {};
      });
  });

  const response = {};
  await Promise.all(promises)
    .then(async (values) => {
      response.success = values.length;
    })
    .catch((values) => {
      response.failures = values.length;
    });
  res.json(response);
});

module.exports = router;
