const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  username: String,
  avatar: String,
  role: {
    type: 'string',
    enum: ['none', 'guest', 'contributor', 'admin'],
    default: 'none',
  },
  method: {
    type: String,
    enum: ['google'],
    required: true,
  },
  google: {
    id: {
      type: String,
    },
    email: {
      type: String,
    },
    displayName: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

// Create a model
const User = mongoose.model('user', userSchema);

// Export the model
module.exports = User;
