const config = require('config');
const AWS = require('aws-sdk');
const FileType = require('file-type');

/**
 * AWSS3 Example of simple class with basic functionality used to upload
 * files to Amaozn S3 bucket
 *
 * @author Maciej Lisowski
 * @since 2018-11-27
 */
class AWSS3 {
  constructor() {
    this.awsConfig = config.aws;

    // On Lambda, credentials come from the execution role - do NOT pass empty
    // accessKeyId/secretAccessKey (that breaks signing). Pass only region + apiVersion.
    const { apiVersion, region } = this.awsConfig;
    this.s3 = new AWS.S3({
      apiVersion,
      region: region || process.env.AWS_REGION,
      signatureVersion: 'v4',
    });

    // Only build the CloudFront signer when real keys exist (avoids a startup crash on empty config).
    const { keyPairId, privateKey } = config.cloudfront || {};
    this.signer = keyPairId && privateKey
      ? new AWS.CloudFront.Signer(keyPairId, privateKey)
      : null;
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
   * @return
   */
  async putObject(buffer, name) {
    const { mime } = await FileType.fromBuffer(buffer);
    const params = {
      Body: buffer,
      Bucket: this.awsConfig.bucket_name,
      Key: name,
      ContentType: mime,
    };

    return this.s3.putObject(params).promise();
  }

  /**
   * Retrieve a signed URL from AWS.
   * https://rajputankit22.medium.com/generate-pre-signed-url-for-the-file-via-node-js-735f0b356644
   *
   * @param {String} asset The asset name to retrieve
   * @returns String signed URL
   */
  getSignedUrl(asset) {
    const params = {
      Key: asset,
      Bucket: config.aws.bucket_name,
      Expires: 60 * 5,
    };
    return this.s3.getSignedUrl('getObject', params);
  }

  /**
   * Add an object to the S3 bucket.
   * @param {string} key  object to name including folders
   * @param {function} callback
   */
  async getObject(key, callback) {
    const { bucket_name: bucketName } = this.awsConfig;

    const params = { Bucket: bucketName, Key: key };
    this.s3.getObject(params, callback);
  }

  /**
   * Remove an object from the s3 bucket
   * @param {string} key  object to name including folders
   * @param {function} callback
   */
  async removeObject(key, callback) {
    const { bucket_name: bucketName } = this.awsConfig;

    const params = { Bucket: bucketName, Key: key };
    this.s3.deleteObject(params, callback);
  }

  /**
   * Generate the cookies required for cloudfront
   * @returns
   */
  generateCookies() {
    if (!this.signer) {
      throw new Error('CloudFront signer is not configured');
    }

    const { cloudfront: { cfUrl, ttl } } = config;

    const policy = {
      Statement: [{
        Resource: `http*://${cfUrl}/*`,
        Condition: {
          DateLessThan: { 'AWS:EpochTime': (Date.now() / 1000) + ttl },
        },
      }],
    };
    const policyString = JSON.stringify(policy);
    const options = { url: `http://${cfUrl}`, policy: policyString };

    return this.signer.getSignedCookie(options);
  }
}

module.exports = new AWSS3();
