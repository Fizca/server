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
  description: {
    type: String,
  },
});

// Create a model
const Asset = mongoose.model('asset', assetSchema);

// Export the model
module.exports = Asset;
