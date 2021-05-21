const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  role: {
    type: 'string',
    enum: ['none', 'guest', 'contributor', 'admin'],
    default: 'none',
  },
  method: {
    type: String,
    enum: ['local', 'google', 'facebook'],
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
    avatar: {
      type: String,
    },
  },
}, {
  timestamps: true,
});

userSchema.methods = {
  name() {
    return this.google.displayName;
  },

  email() {
    return this.google.email;
  },

  providerId() {
    return this.google.id;
  },
};

// Create a model
const User = mongoose.model('user', userSchema);

// Export the model
module.exports = User;
