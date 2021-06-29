const mongoose = require('mongoose');

const { Schema } = mongoose;

const tagSchema = new Schema({
  name: String,
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'profile',
    required: true,
    index: true,
  },
},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

tagSchema.virtual('moments', {
  ref: 'moments', // The model to use
  localField: '_id', // Find people where `localField`
  foreignField: 'tags', // is equal to `foreignField`
  // If `justOne` is true, 'members' will be a single doc as opposed to
  // an array. `justOne` is false by default.
  // justOne: false,
  // options: { sort: { name: -1 }, limit: 1 }, // Query options, see http://bit.ly/mongoose-query-options
});

/**
 * Create a new tag
 * @param {Array} tags
 * @param {Profile} profile
 * @returns
 */
tagSchema.statics.Upsert = function Upsert(tags, profile) {
  const promises = tags.map((tag) => {
    const query = { name: tag, profile };
    const doc = this.findOneAndUpdate(query, query, {
      new: true,
      upsert: true,
    });
    return doc;
  });
  return Promise.all(promises);
};

// Create a model
const Tag = mongoose.model('tag', tagSchema);

// Export the model
module.exports = Tag;
