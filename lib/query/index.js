const camelize = require('./camelize')
const order = require('./order')
const joins = require('./joins')
const upsert = require('./upsert')

// Generate a query builder from a knex connection and a schema
function generate (knex, schema) {
  // Create qb
  var qb = knex(schema.tableName)
  qb = Object.create(qb)

  // Our qb extensions
  camelize.extendQuery(qb)
  order.extendQuery(qb, schema)
  joins.extendQuery(qb, schema, knex.joins)
  upsert.extendQuery(qb, schema)

  // Custom qb extensions
  return Object.assign(qb, schema.queries)
}

module.exports = {
  generate
}
