// clear-all-data.js — Deletes ALL documents using raw MongoDB driver
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart-meeting-assistant';

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const dbName = new URL(MONGO_URI.replace('mongodb://', 'http://').replace('mongodb+srv://', 'http://')).pathname.replace('/', '') || 'smart-meeting-assistant';
  const db = client.db(dbName);

  const collections = await db.listCollections().toArray();
  console.log(`\n🗑  Found ${collections.length} collections in "${dbName}":\n`);

  for (const col of collections) {
    const result = await db.collection(col.name).deleteMany({});
    console.log(`  ✅ ${col.name}: deleted ${result.deletedCount} documents`);
  }

  console.log('\n✅ All data cleared successfully.\n');
  await client.close();
  process.exit(0);
})();
