// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-meeting-assistant';
    
    const conn = await mongoose.connect(mongoURI, {
      // These options are now default in Mongoose 6+
      // but included for clarity
    });

    console.log(`
╔════════════════════════════════════════════════════╗
║  MongoDB Connected Successfully                    ║
║  Host: ${conn.connection.host.padEnd(42)}║
║  Database: ${conn.connection.name.padEnd(38)}║
╚════════════════════════════════════════════════════╝
    `);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('\n💡 Make sure MongoDB is running:');
    console.error('   - Local: Start MongoDB service');
    console.error('   - Cloud: Check MONGODB_URI in .env file\n');
    process.exit(1);
  }
};

module.exports = connectDB;