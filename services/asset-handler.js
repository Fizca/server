const crypto = require('crypto');
const exifr = require('exifr');
const path = require('path');
const Sharp = require('sharp');

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
    const {
      width, height, fit, format,
    } = options;
    return Sharp(filepath)
      .toFormat(format)
      .resize({ width, height, fit })
      .toBuffer()
      .then((buffer) => buffer)
      .catch((e) => {
        console.log('unable to resize image:', e.message);
        return false;
      });
  }

  /**
   * Retrieve data from the EXIF block of the image
   * @param {object} filepath
   * @returns
   */
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

  /**
   * hash the original name of the file to make them both uniform and less
   * predictable
   * @param {string} originalname
   * @param {string} salt
   * @returns
   */
  static HashFileName(originalname, salt) {
    const hash = crypto.createHash('sha256').update(`${originalname}-${salt}`).digest('hex');
    return `${hash}${path.extname(originalname)}`;
  }

  /**
   * Loop through all configurations to generate images
   * @param {string} filepath
   * @param {string} name
   * @param {string} name
   * @returns
   */
  static GenerateResizedImages(filepath, options) {
    const promises = options.map((entry) => {
      console.log(`Processing ${filepath}: ${entry}`);
      return this.Resizer(filepath, entry);
    });
    return Promise.all(promises);
  }
}

module.exports = AssetHandler;
