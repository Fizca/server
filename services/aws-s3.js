const config = require('config');
const AWS = require('aws-sdk');

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
    // Response block.
    const { bucket_name: bucketName, region } = this.awsConfig;
    const res = {
      name,
      filepath: `https://${bucketName}.s3-${region}.amazonaws.com/${name}`,
      data: [],
    };

    const params = {
      Body: buffer,
      Bucket: this.awsConfig.bucket_name,
      Key: name,
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
}

module.exports = new AWSS3();
