const mongoose = require('mongoose');

const { Schema } = mongoose;

const assetSchema = new Schema({
  type: {
    type: String,
    enum: ['image'],
    required: true,
    default: 'image',
  },
  name: {
    type: String,
  },
  takenAt: {
    type: Number,
    default: Date.now(),
  },
  metadata: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'profile',
    required: true,
    index: true,
  },
  moment: {
    type: Schema.Types.ObjectId,
    ref: 'moment',
    index: true,
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'tag',
    index: true,
  }],
}, {
  timestamps: true,
});

/**
 * Get a paginated result in desc order by takenAt.
 * @param {number} page
 * @param {number} limit
 * @returns Array of results
 */
assetSchema.query.getPage = function getPage(page, limit) {
  return this.skip(limit * page)
    .limit(limit)
    .sort([['takenAt', -1]]);
};

// Create a model
const Asset = mongoose.model('asset', assetSchema);

// Export the model
module.exports = Asset;
