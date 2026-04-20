/**
 * Seed the default design into MongoDB.
 * Run after MongoDB is connected:
 *   MONGO_URI=mongodb://... node seedDefaultDesign.js
 */
const mongoose = require('mongoose');
const Design = require('./models/Design');
const path = require('path');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/alfuttaim';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Load the bundled style config as the default baseSnapshot
  const stylesPath = path.join(__dirname, '..', 'app', '(tabs)', '(v2)', 'market-intelligence', 'style_configurations.json');
  const baseSnapshot = JSON.parse(fs.readFileSync(stylesPath, 'utf8')).overview;

  // Upsert the default design
  await Design.findOneAndUpdate(
    { file: 'default.json' },
    {
      name: 'Default',
      file: 'default.json',
      designerName: 'System',
      description: 'Default style configuration',
      overrides: {},
      baseSnapshot,
      lastComment: '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Default design seeded');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
