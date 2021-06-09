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

// Create a model
const Tag = mongoose.model('tag', tagSchema);

// Export the model
module.exports = Tag;
