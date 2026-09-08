// Loads all SSM parameters under SSM_PREFIX into process.env, then starts the app.
// Runs before app.js so node-config sees the values. Uses aws-sdk v2 (already a dependency).
const AWS = require('aws-sdk');

const ssm = new AWS.SSM();
const prefix = process.env.SSM_PREFIX;

async function loadConfig() {
  if (!prefix) {
    console.warn('SSM_PREFIX not set - skipping SSM config load');
    return;
  }

  let nextToken;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await ssm
      .getParametersByPath({
        Path: prefix,
        WithDecryption: true,
        Recursive: true,
        NextToken: nextToken,
      })
      .promise();

    res.Parameters.forEach((param) => {
      const key = param.Name.split('/').pop();
      // Don't override values already provided directly as Lambda env vars.
      if (process.env[key] === undefined) {
        process.env[key] = param.Value;
      }
    });

    nextToken = res.NextToken;
  } while (nextToken);
}

loadConfig()
  .then(() => {
    // eslint-disable-next-line global-require
    require('./app.js');
  })
  .catch((err) => {
    console.error('Failed to load SSM config:', err);
    process.exit(1);
  });
