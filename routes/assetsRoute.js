const path = require('path');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const S3 = require('../services/aws-s3');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

/**
 * Create a new expression
 */
router.post('', upload.single('image'), async (req, res) => {
  const { file, body, user = {} } = req;
  const { id: owner } = user;
  const { text, levels } = body;

  let image = 'hello';
  if (file) {
    const { originalname, path: filePath } = file;
    const original = `${Date.now()}-${owner}-${originalname}`;
    const hash = crypto.createHash('sha256').update(original).digest('hex');
    const imageName = `${hash}${path.extname(originalname)}`;
    console.log(`Hashing image for user: ${original} => ${imageName}`);
    const result = await S3.upload(filePath, imageName)
      .catch((err) => {
        console.log('Unable to upload image to S3', err.message);
        return {};
      });
    image = result.filepath;
  }

  res.json({ image });
});

module.exports = router;
