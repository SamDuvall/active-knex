const path = require('path')

const config = {
  client: 'mysql',
  // debug: true,
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'knex'
  },
  pool: {
    min: 0,
    max: 100
  },
  schema: {
    filename: path.resolve(__dirname, 'test/schema.sql')
  }
}

module.exports = {
  development: config,
  test: config
}
