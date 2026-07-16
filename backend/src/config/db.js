const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME;
  if (!uri) throw new Error('MONGO_URL is not defined');
  if (!dbName) throw new Error('DB_NAME is not defined');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`[Groveno] MongoDB connected → db: ${dbName}`);
  return mongoose.connection;
}

module.exports = connectDB;
