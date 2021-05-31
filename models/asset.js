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
}, {
  timestamps: true,
});

/**
 * Get a paginated result in desc order by id.
 * @param {number} page
 * @param {number} limit
 * @returns Array of results
 */
assetSchema.statics.getPage = function getPage(page, limit) {
  return this.skip(limit * page)
    .limit(limit)
    .sort([['_id', -1]]);
};

// Create a model
const Asset = mongoose.model('asset', assetSchema);

// Or, equivalently, you can call `animalSchema.static()`.

// Export the model
module.exports = Asset;
