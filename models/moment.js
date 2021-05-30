const mongoose = require('mongoose');

const { Schema } = mongoose;

const momentSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  text: String,
  assets: [{
    type: Schema.Types.ObjectId,
    ref: 'asset',
  }],
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
}, {
  timestamps: true,
});

// Create a model
const Moment = mongoose.model('moment', momentSchema);

// Export the model
module.exports = Moment;
