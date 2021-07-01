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
    // Amazon SES configuration
    // current version of Amazon S3 API (see: https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
    this.awsConfig = config.aws;

    this.s3 = new AWS.S3(this.awsConfig);

    this.signer = new AWS.CloudFront.Signer(
      config.cloudfront.keyPairId,
      config.cloudfront.privateKey,
    );
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
    // Response block.
    const { bucket_name: bucketName, region } = this.awsConfig;
    const res = {
      name,
      filepath: `https://${bucketName}.s3-${region}.amazonaws.com/${name}`,
      data: [],
    };

    const { mime } = await FileType.fromBuffer(buffer);
    const params = {
      Body: buffer,
      Bucket: this.awsConfig.bucket_name,
      Key: name,
      ContentType: mime,
    };

    return this.s3.putObject(params, (e, d) => {
      if (e) {
        throw e;
      }
      res.data.push(d);
      return res;
    });
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

  async getObject(key, callback) {
    const { bucket_name: bucketName } = this.awsConfig;

    const params = { Bucket: bucketName, Key: key };
    this.s3.getObject(params, callback);
  }

  /**
   * Generate the cookies required for cloudfront
   * @returns
   */
  generateCookies() {
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
