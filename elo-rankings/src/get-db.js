const mongodb = require('mongodb');
const mongoUrl = process.env.MONGO_URI || 'mongodb://mongodb:27017/elo_rankings'; // Fallback to a default if not set in the env

const connection = mongodb.MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .catch(err => {
    console.error('Error connecting to database');
    console.error(err.stack || err);
    process.exit(-1);
  });

module.exports = connection;
