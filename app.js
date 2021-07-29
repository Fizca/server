require('./services/database');

const config = require('config');
const connectMongo = require('connect-mongo');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const assetsRoute = require('./routes/assets-route');
const authRoute = require('./routes/auth-route');
const momentsRoute = require('./routes/moments-route');
const profilesRoute = require('./routes/profiles-route');
const tagsRoute = require('./routes/tags-route');
const usersRoute = require('./routes/users-route');
const vitalsRoute = require('./routes/vitals-route');

const app = express();
const MongoStore = connectMongo(session);

mongoose.set('useCreateIndex', true);

/**
 * Middleware
 */
app.set('trust proxy', 1);

// Store the session on mongo
app.use(session({
  secret: config.session.secret,
  proxy: true,
  cookie: {
    httpOnly: false,
    sameSite: 'none',
    maxAge: config.session.max_age_millis,
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

app.use('/assets', assetsRoute);
app.use('/auth', authRoute);
app.use('/moments', momentsRoute);
app.use('/profiles', profilesRoute);
app.use('/tags', tagsRoute);
app.use('/users', usersRoute);
app.use('/vitals', vitalsRoute);

/**
 * Routes
 */
app.get('/', async (req, res) => {
  res.json({ hello: 'world' });
});

/**
 * Startup
 */
const port = process.env.PORT || config.port;
app.listen(port, () => {
  console.log(`Express server is running on port: ${port}...`);
});
