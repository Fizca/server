const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Sharp = require('sharp');
const S3 = require('./aws-s3');
const Asset = require('../models/asset');

/**
 * AWSS3 Example of simple class with basic functionality used to upload
 * files to Amaozn S3 bucket
 *
 * @author Maciej Lisowski
 * @since 2018-11-27
 */
class AssetHandler {
  /**
   * Resize the image using sharp
   *
   * @param {string} filepath
   * @param {object} options
   * @returns
   */
  static Resizer(filepath, options) {
    const { width, height, fit } = options;
    return Sharp(filepath)
      .resize({ width, height, fit })
      .toBuffer()
      .then((buffer) => buffer)
      .catch((e) => {
        console.log('unable to resize image:', e.message);
        return false;
      });
  }

  /**
   * Uploads the image to the S3 bucket
   *
   * @param {string} filepath The file path
   * @param {string} name The name for the asset
   * @returns
   */
  static async Upload(filepath, name) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`the file ${filepath} does not exist`);
    }
    const buffer = fs.readFileSync(filepath, null);
    const resized = await this.Resizer(buffer, { width: 200, height: 200, fit: 'inside' });
    return S3.putObject(resized, name);
  }

  static async CreateImage(file) {
    const { originalname, path: filePath } = file;
    const original = `${Date.now()}-${originalname}`;
    const hash = crypto.createHash('sha256').update(original).digest('hex');
    const name = `${hash}${path.extname(originalname)}`;
    console.log(`Hashing image for user: ${original} => ${name}`);

    await this.Upload(filePath, name);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.log(`Unable to delete ${filePath}`);
      }
    });

    const asset = new Asset({
      name,
      type: 'image',
    });
    return asset.save();
  }
}

module.exports = AssetHandler;
