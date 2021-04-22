const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
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
      lowercase: true,
    },
    displayName: {
      type: String,
      lowercase: true,
    },
    avatar: {
      type: String,
      lowercase: true,
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
