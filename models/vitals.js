const mongoose = require('mongoose');

const { Schema } = mongoose;

const vitalsSchema = new Schema({
  weight: Number,
  head: Number,
  height: Number,
  temp: Number,
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'profile',
  },
  takenAt: {
    type: Date,
    default: Date.now(),
  },
}, {
  timestamps: true,
});

// Create a model
const Vitals = mongoose.model('vitals', vitalsSchema);

// Export the model
module.exports = Vitals;
