const express = require('express');
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);

// optional: load .env in development (must be done before loading config/db)
try { require('dotenv').config(); } catch (e) { /* dotenv not installed - that's fine */ }
const fs = require('fs');
const path = require('path');
const dbConfig = require('./config/db');
const app = express();

// view engine and body parsing
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Development Content-Security-Policy helper: allow connect to self and devtools endpoints
// Note: in development we allow inline styles for convenience. For production, use nonces or hashes instead.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // allow connect-src to self and localhost (for devtools), allow inline styles in dev,
    // and allow images from Shutterstock plus data URLs for convenience in development
    res.setHeader('Content-Security-Policy', "default-src 'none'; connect-src 'self' http://localhost:3000; style-src 'self' 'unsafe-inline'; img-src 'self' https://image.shutterstock.com data:;");
    next();
  });
}

// controllers and middleware
const appController = require('./controllers/appController');
const isAuth = require('./middleware/is-auth');

// const mongoURI = process.env.MONGO_URI; // unused

// connect to MongoDB
// Note: modern mongoose (v6+) removed options like useNewUrlParser/useCreateIndex/useUnifiedTopology
// just pass the connection string and handle the returned promise.
const port = process.env.PORT || 3000;

// use dbConfig for connection
const MONGO_URI = dbConfig.MONGO_URI || dbConfig.MONGO_URI || process.env.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI || dbConfig.MONGO_URI;

// Attempt to connect using db module. The module exposes connect() which returns a promise and MONGO_URI.
if (!dbConfig.MONGO_URI && !process.env.MONGO_URI) {
  console.warn('No MongoDB URI configured in config/default.json or env. Starting without DB (development only).');
  if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`Server listening on port ${port} (no DB)`));
  } else {
    console.error('In production NODE_ENV=production and no DB configured — exiting.');
    process.exit(1);
  }
} else {
  dbConfig.connect()
    .then(() => {
      console.log('MongoDB connected');

      // Create MongoDB-backed session store
      let store = null;
      try {
        store = new MongoDBSession({ uri: dbConfig.MONGO_URI, collection: 'mySessions' });
        store.on('error', (e) => console.error('Session store error:', e));
      } catch (e) {
        console.error('Failed to create MongoDB session store:', e.message);
      }

      if (store) sessionOptions.store = store;

      // register session middleware and routes
      app.use(session(sessionOptions));
      registerRoutes();

      app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
      });
    })
    .catch(err => {
      if (err && err.message && /authentication failed|bad auth/i.test(err.message)) {
        console.error('MongoDB authentication failed. Check DB_USER/DB_PASSWORD or your MONGO_URI, and ensure your IP is allowed in Atlas Network Access.');
      } else {
        console.error('MongoDB connection error:', err);
      }

      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        console.warn('Starting server without DB (development).');

        // start without Mongo session store (in-memory sessions)
        app.use(session(sessionOptions));
        registerRoutes();

        app.listen(port, () => console.log(`Server listening on port ${port} (DB unavailable)`));
      }
    });
}



// Create a session store only when we have a MongoDB URI. For development without DB, skip it.
// sessionConfig loads session defaults from config/default.json if present
const sessionConfig = (() => {
  let conf = {};
  try { conf = require(path.join(__dirname, 'config', 'default.json')); } catch (e) { /* ignore */ }
  return conf;
})();

const sessionOptions = {
  secret: process.env.SESSION_SECRET || sessionConfig.SESSION_SECRET || 'key that will sign cookies',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
};

// We'll register session middleware after we decide whether to use a Mongo-backed store.

function registerRoutes() {
  // lightweight test route to inspect session
  app.get('/test-session', (req, res) => {
    req.session.isAuth = true;
    console.log('Session initialized:', req.session);
    res.send('Hello from Express!');
  });

  // landing page
  app.get('/', appController.landing_page);

  // login page
  app.get('/login', appController.login_get);
  app.post('/login', appController.login_post);

  app.get('/register', appController.register_get);
  app.post('/register', appController.register_post);

  app.get('/dashboard', isAuth, appController.dashboard_get);
  app.post('/logout', appController.logout_post);
}
// Routes are registered inside registerRoutes() after the session middleware
// is set up (so req.session is available). Do not define routes here.

// Global error handler — logs error and returns 500 JSON in development-friendly format
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal Server Error', message: process.env.NODE_ENV === 'production' ? undefined : (err && err.message) });
});