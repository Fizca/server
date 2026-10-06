const config = require('config');
const connectMongo = require('connect-mongo');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const { connectDatabase } = require('./services/database');

const assetsRoute = require('./routes/assets-route');
const authRoute = require('./routes/auth-route');
const momentsRoute = require('./routes/moments-route');
const profilesRoute = require('./routes/profiles-route');
const tagsRoute = require('./routes/tags-route');
const usersRoute = require('./routes/users-route');
const vitalsRoute = require('./routes/vitals-route');

const app = express();
const MongoStore = connectMongo(session);

app.set('trust proxy', true);

mongoose.set('useCreateIndex', true);

/**
 * Middleware
 */
// Store the session on mongo
app.use(session({
  secret: config.session.secret,
  proxy: true,
  cookie: {
    httpOnly: false,
    sameSite: config.session.sameSite,
    secure: config.session.secure,
    maxAge: config.session.max_age_millis,
    credentials: true,
  },
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
}));

app.use(cors({
  origin: config.cors_whitelist.split(','),
  credentials: true,
}));

app.use((req, res, next) => {
  const date = new Date();
  console.log(`[${date.toLocaleDateString()} ${date.toLocaleTimeString()}][${req.method}] ${req.originalUrl}`);
  next();
});

app.use(express.json());

const apiRouter = express.Router();

apiRouter.use('/assets', assetsRoute);
apiRouter.use('/auth', authRoute);
apiRouter.use('/moments', momentsRoute);
apiRouter.use('/profiles', profilesRoute);
apiRouter.use('/tags', tagsRoute);
apiRouter.use('/users', usersRoute);
apiRouter.use('/vitals', vitalsRoute);

// Same-origin health check reached by the SPA through the Cloudflare proxy.
apiRouter.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  if (connected) {
    res.status(200).json({ status: 'ok', db: 'connected' });
  } else {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

app.use('/api', apiRouter);

/**
 * Routes
 */
app.get('/', async (req, res) => {
  res.json({ hello: 'world' });
});

/**
 * Startup
 */
async function start() {
  await connectDatabase();
  const port = process.env.PORT || config.port;
  app.listen(port, () => {
    console.log(`Express server is running on port: ${port}...`);
  });
}

module.exports = { app, start };
