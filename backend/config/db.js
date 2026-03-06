const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    // Try to connect to existing MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Local MongoDB not found: ${error.message}`);
    console.log(`⏳ Starting In-Memory MongoDB Server instead...`);
    
    // Fallback to in-memory db
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    const conn = await mongoose.connect(uri);
    console.log(`✅ In-Memory MongoDB connected: ${conn.connection.host}`);
  }
};

module.exports = connectDB;
