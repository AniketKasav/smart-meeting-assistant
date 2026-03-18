// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-meeting-assistant';
    
    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
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
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if IP is whitelisted in MongoDB Atlas');
    console.error('   2. Verify connection string in .env file');
    console.error('   3. Ensure password has no special characters');
    console.error('   4. Wait 1-2 minutes after whitelisting IP\n');
    
    // Don't exit - allow server to run without DB for now
    console.warn('⚠️  Server running without database connection');
    return null;
  }
};

module.exports = connectDB;

module.exports = connectDB;