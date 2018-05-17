const EXTENSIONS = [
  require('./camelize'),
  require('./order'),
  require('./joins'),
  require('./upsert')
]

// Generate a query builder from a knex connection and a schema
function generate (knex, schema) {
  // Create qb
  let qb = knex(schema.tableName)
  qb = Object.create(qb)

  // Our qb extensions
  EXTENSIONS.forEach(extendQuery => {
    extendQuery(qb, schema, knex.joins)
  })

  // Custom qb extensions
  return Object.assign(qb, schema.queries)
}

module.exports = {
  generate
}
