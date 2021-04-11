const config = require('config');
const AWS = require('aws-sdk');
const fs = require('fs');
const Sharp = require('sharp');

/**
 * AWSS3 Example of simple class with basic functionality used to upload
 * files to Amaozn S3 bucket
 *
 * @author Maciej Lisowski
 * @since 2018-11-27
 */
class AWSS3 {
  constructor() {
    // Amazon SES configuration
    // current version of Amazon S3 API (see: https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
    this.awsConfig = config.aws;

    this.s3 = new AWS.S3(this.awsConfig);
  }

  /**
   * S3Upload method used to upload file from given location into Amazon S3 Bucket
   * If you are uploading an image you can sepcify param resize and create
   * ne thumbnail to be uploaded to S3 bucket
   *
   * @author Maciej Lisowski
   * @since 2018-11-27
   * @param {String} filepath
   * @param {String} name
   * @param {JSON} options eg. { resize: { width: 300, height: 400 } }
   * @return
   */
  putObject(buffer, name) {
    return new Promise((resolve, reject) => {
      // Response block.
      const { bucket_name: bucketName, region } = this.awsConfig;
      const res = {
        filepath: `https://${bucketName}.s3-${region}.amazonaws.com/${name}`,
        data: [],
      };

      const params = {
        Body: buffer,
        Bucket: this.awsConfig.bucket_name,
        Key: name,
      };

      this.s3.putObject(params, (e, d) => {
        if (e) {
          reject(e);
        }
        res.data.push(d);
        resolve(res);
      });
    });
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
  async upload(filepath, name) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`the file ${filepath} does not exist`);
    }
    const buffer = fs.readFileSync(filepath, null);
    const resized = await AWSS3.Resizer(buffer, { width: 200, height: 200, fit: 'inside' });
    return this.putObject(resized, name);
  }

  /**
   * Retrieve a signed URL from AWS.
   * https://rajputankit22.medium.com/generate-pre-signed-url-for-the-file-via-node-js-735f0b356644
   *
   * @param {String} asset The asset name to retrieve
   * @returns String signed URL
   */
  async getSingedUrl(asset) {
    const params = {
      Key: asset,
      Bucket: config.aws.bucket_name,
      Expires: 60 * 5,
    };
    return new Promise((resolve, reject) => {
      this.s3.getSignedUrl('getObject', params, (err, url) => (err ? reject(err) : resolve(url)));
    });
  }
}

module.exports = new AWSS3();
