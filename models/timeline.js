const mongoose = require('mongoose');

const { Schema } = mongoose;

const timelineSchema = new Schema({
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'profile',
    required: true,
    index: true,
  },
  asset: {
    type: Schema.Types.ObjectId,
    ref: 'asset',
    index: true,
  },
  moment: {
    type: Schema.Types.ObjectId,
    ref: 'moment',
    index: true,
  },
  vitals: {
    type: Schema.Types.ObjectId,
    ref: 'vitals',
    index: true,
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'tag',
    index: true,
  }],
  takenAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

/**
 * Get a paginated result in desc order by id.
 * @param {number} page
 * @param {number} limit
 * @returns Array of results
 */
timelineSchema.query.getPage = function getPage(page, limit) {
  return this.skip(limit * page)
    .limit(limit)
    .sort([['takenAt', 1]]);
};

// Create a model
const Timeline = mongoose.model('timeline', timelineSchema);

// Export the model
module.exports = Timeline;
