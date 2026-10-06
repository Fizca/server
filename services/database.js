const config = require('config');
const mongoose = require('mongoose');

const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));
database.once('open', () => {
  console.log('connected to mongodb');
});

// Connect once at startup. Swallow the initial-connection error so a DB outage
// at cold start surfaces as clean per-request failures instead of a process
// crash (unhandled rejection -> Lambda Runtime.ExitError).
async function connectDatabase() {
  try {
    await mongoose.connect(config.database.mongodb.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      bufferCommands: false,
    });
  } catch (err) {
    console.error('Failed to establish initial MongoDB connection:', err.message);
  }
}

module.exports = { database, connectDatabase };
