const crypto = require('crypto');
const exifr = require('exifr');
const fs = require('fs');
const path = require('path');
const Sharp = require('sharp');

const S3 = require('./aws-s3');
const Asset = require('../models/asset');

const MAX_IMAGE_COUNT = 13;

/**
 * AWSS3 Example of simple class with basic functionality used to upload
 * files to Amaozn S3 bucket
 *
 * @author Maciej Lisowski
 * @since 2018-11-27
 */
class AssetHandler {
  static get MaximumImageCount() {
    return MAX_IMAGE_COUNT;
  }

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

  /**
   * Create new image
   * @param {Object} fileData
   * @param {Object} user
   */
  static async CreateImage(fileData, user) {
    const { originalname, path: filepath } = fileData;

    const metadata = await this.ExtractMetadata(filepath);

    const original = `${Date.now()}-${originalname}`;
    const hash = crypto.createHash('sha256').update(original).digest('hex');
    const name = `${hash}${path.extname(originalname)}`;
    console.log(`Hashing image for user: ${original} => ${name}`);

    await this.Upload(filepath, name);
    console.log(`Successfully uploaded image: ${name}`);

    fs.unlink(filepath, (err) => {
      if (err) {
        console.log(`Unable to delete ${filepath}`);
      }
    });

    const asset = new Asset({
      name,
      type: 'image',
      user,
      takenAt: metadata.createdAt || Date.now(),
      metadata: {
        latitude: metadata.latitude,
        longitude: metadata.longitude,
      },
    });
    return asset.save();
  }

  /**
   * Create multiple images.
   * @param {Object} file
   * @param {Object} user
   */
  static async CreateMultipleImages(files, user) {
    // Upload the file and create the asset
    const promises = await files.map(async (file) => {
      const asset = await AssetHandler.CreateImage(file, user)
        .catch((err) => {
          console.log('Unable to upload image to S3', err.message);
          return false;
        });
      return asset;
    });

    // Get only the assets that passed.
    const assets = await Promise.all(promises);
    return assets.filter((asset) => asset);
  }

  static async ExtractMetadata(filepath) {
    const metadata = await exifr.parse(filepath)
      .then((data) => data || {})
      .catch((error) => {
        console.log(error);
        return {};
      });

    return {
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      createdAt: metadata.CreateDate,
      modifiedAt: metadata.ModifyDate,
    };
  }
}

module.exports = AssetHandler;
