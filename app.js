require('./services/database');

const config = require('config');
const express = require('express');

const assetsRoute = require('./routes/assets-route');
const googleRoute = require('./routes/google-route');
const passport = require('./services/passport');

const app = express();

/**
 * Middleware
 */
app.use((req, res, next) => {
  const date = new Date();
  console.log(`[${date.toLocaleDateString()} ${date.toLocaleTimeString()}][${req.method}] ${req.originalUrl}`);
  next();
});
app.use(passport.initialize());
app.use(passport.session());

app.use('/assets', assetsRoute);
app.use('/google', googleRoute);

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
