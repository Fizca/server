const config = require('config');
const mongoose = require('mongoose');

const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));
database.once('open', () => {
  console.log('connected to mongodb');
});

const RETRY_DELAY_MS = 5000;

// Attempt the connection and, on failure, reschedule in the background. The
// server listens before this resolves (see app.start), so a cold-start instance
// that misses the first connect recovers instead of serving a permanently
// degraded state. The error is swallowed (no rethrow) so a DB outage never
// crashes the process (unhandled rejection -> Lambda Runtime.ExitError).
async function attemptConnection() {
  try {
    await mongoose.connect(config.database.mongodb.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      bufferCommands: false,
    });
  } catch (err) {
    console.error('Failed to establish initial MongoDB connection, retrying:', err.message);
    // unref so a pending retry never keeps the process (or a test runner) alive.
    const timer = setTimeout(attemptConnection, RETRY_DELAY_MS);
    if (timer.unref) timer.unref();
  }
}

async function connectDatabase() {
  await attemptConnection();
}

module.exports = { database, connectDatabase };
