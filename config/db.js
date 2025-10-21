const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load file config if present
let fileConfig = {};
const configPath = path.join(__dirname, 'default.json');
if (fs.existsSync(configPath)) {
  try { fileConfig = require(configPath); } catch (e) { /* ignore */ }
}

function buildMongoUri() {
  // prefer explicit URI in environment
  const envUri = process.env.MONGO_URI && process.env.MONGO_URI.toString().trim();
  if (envUri) return envUri;

  // then prefer value in config/default.json (e.g. "mongoURI") if non-empty
  const fileUri = (fileConfig.mongoURI || fileConfig.MONGO_URI || '').toString().trim();
  if (fileUri) return fileUri;

  // If user and password are present, attempt to build an Atlas URI.
  // sanitize helper: remove leading export and surrounding quotes
  const sanitize = (v) => {
    if (!v) return v;
    let s = v.toString().trim();
    if (s.startsWith('export ')) s = s.slice(7).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    return s;
  };

  const user = sanitize(process.env.DB_USER);
  const pass = sanitize(process.env.DB_PASSWORD);
  if (user && pass) {
    const cluster = (process.env.DB_CLUSTER || 'cluster0.amyvm9g.mongodb.net').toString().trim();
    const dbName = (process.env.DB_NAME || '').toString().trim();
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    // If cluster already contains protocol, assume the user provided full host
    const host = cluster.replace(/^mongodb(\+srv)?:\/\//, '');
    const dbSegment = dbName ? `/${dbName}` : '';
    return `mongodb+srv://${encodedUser}:${encodedPass}@${host}${dbSegment}?retryWrites=true&w=majority&appName=Cluster0`;
  }

  // no URI available
  return null;
}

const MONGO_URI = buildMongoUri();

function connect() {
  if (!MONGO_URI) return Promise.reject(new Error('No MongoDB URI configured'));
  return mongoose.connect(MONGO_URI);
}

module.exports = { connect, MONGO_URI };
