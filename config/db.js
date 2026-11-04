const { MongoClient } = require("mongodb");

async function connectDB() {
  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error("MONGODB_URI and DB_NAME must be set in .env");
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);

    await db.command({ ping: 1 });

    console.log(`MongoDB connected: ${db.databaseName}`);

    return db;
  } catch (error) {
    await client.close();
    throw error;
  }
}

module.exports = connectDB;
