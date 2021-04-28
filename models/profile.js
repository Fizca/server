const mongoose = require('mongoose');

const { Schema } = mongoose;

const profileSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  birthday: {
    type: Number,
  },
  nickname: {
    type: String,
  },
}, {
  timestamps: true,
});

// Create a model
const Profile = mongoose.model('profile', profileSchema);

// Export the model
module.exports = Profile;
