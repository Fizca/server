const mongoose = require('mongoose');

const { Schema } = mongoose;

const AuthTokenSchema = new Schema({
  _id: String,
  status: {
    type: 'string',
    enum: ['active', 'expired'],
    default: 'expired',
  },
  createdAt: {
    type: Date,
    expires: 24 * 60 * 60 * 1000,
    default: Date.now,
  },
});

// Create a model
const AuthToken = mongoose.model('auth-token', AuthTokenSchema);

// Export the model
module.exports = AuthToken;
