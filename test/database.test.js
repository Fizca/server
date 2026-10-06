/* eslint-env jest */
const mongoose = require('mongoose');
const { connectDatabase } = require('../services/database');

describe('connectDatabase', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolves (does not reject) when the initial connection fails', async () => {
    jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('no route to host'));
    await expect(connectDatabase()).resolves.toBeUndefined();
  });

  it('passes serverless-tuned options to mongoose.connect', async () => {
    const spy = jest.spyOn(mongoose, 'connect').mockResolvedValue();
    await connectDatabase();
    const [, options] = spy.mock.calls[0];
    expect(options).toMatchObject({
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      bufferCommands: false,
    });
  });
});
