const User = require('../models/user');

class Authentication {
  static async GoogleUser(data) {
    const {
      name, email, picture, sub,
    } = data;

    const user = await User.findOne({
      method: 'google',
      'google.email': email,
    });

    if (!user) {
      Promise.reject(new Error(`user ${name} not allowed`));
    }

    user.username = name;
    user.avatar = picture;
    user.google = {
      id: sub,
      email,
      displayName: name,
    };
    user.save();

    return user;
  }
}

module.exports = Authentication;
