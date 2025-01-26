const path = require('path')
require('dotenv').config();

const config = {
	mongoUrl: process.env.MONGO_URI
}
console.log(config)
module.exports = config
