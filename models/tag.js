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
