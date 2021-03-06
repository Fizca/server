const mongoose = require('mongoose');

const { Schema } = mongoose;

const momentSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  takenAt: {
    type: Date,
    required: true,
    default: Date.now(),
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
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'tag',
    index: true,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

momentSchema.virtual('assets', {
  ref: 'asset', // The model to use
  localField: '_id', // Find assets where `localField`
  foreignField: 'moment', // is equal to `foreignField`
  // If `justOne` is true, 'members' will be a single doc as opposed to
  // an array. `justOne` is false by default.
  // Query options, see http://bit.ly/mongoose-query-options
});

momentSchema.query.getPage = function getPage(page, limit) {
  return this.skip(limit * page)
    .limit(limit)
    .sort([['takenAt', -1]]);
};

// Create a model
const Moment = mongoose.model('moment', momentSchema);

// Export the model
module.exports = Moment;
