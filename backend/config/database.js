// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-meeting-assistant';
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout for initial connection
      socketTimeoutMS: 45000,          // 45s timeout for individual operations
      connectTimeoutMS: 10000,         // 10s TCP connection timeout
      // ✅ Connection pool tuning — prevents connection exhaustion on free tier
      maxPoolSize: 10,                 // max concurrent connections
      minPoolSize: 2,                  // keep at least 2 alive to avoid cold reconnects
      // ✅ Keep the connection alive to prevent Atlas idle-timeout disconnects
      heartbeatFrequencyMS: 10000,     // ping every 10s
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
      console.log('✅ MongoDB reconnected');
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
