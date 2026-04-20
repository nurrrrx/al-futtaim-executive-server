const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/alfuttaim';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Server will continue without MongoDB — designs will not persist');
  }
}

module.exports = { connectDB };
