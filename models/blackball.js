const mongoose = require('mongoose');

const { Schema } = mongoose;

const blackballSchema = new Schema({
  _id: String,
  createdAt: {
    type: Date,
    expires: 24 * 60 * 60 * 1000,
    default: Date.now,
  },
});

// Create a model
const Blackball = mongoose.model('blackball', blackballSchema);

// Export the model
module.exports = Blackball;
