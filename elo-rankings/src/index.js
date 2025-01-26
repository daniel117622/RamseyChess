const app = require('./http')
const package = require('../package')


const port = process.env.PORT || 3000
app.listen(port, () => {
	console.log('Listening on', port)
})

console.log('Elo ranking server %s', package.version)
