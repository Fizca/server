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
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
}, {
  timestamps: true,
});

// Create a model
const Asset = mongoose.model('asset', assetSchema);

// Export the model
module.exports = Asset;
