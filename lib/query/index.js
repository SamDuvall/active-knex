var _ = require('underscore');
var camelize = require('./camelize');
var defer = require('./defer');
var order = require('./order');
var joins = require('./joins');
var upsert = require('./upsert');

// Generate a query builder from a knex connection and a schema
function generate(knex, schema) {
  // Create qb
  var qb = knex(schema.tableName);
  qb = Object.create(qb);

  // Our qb extensions
  camelize.extendQuery(qb, schema);
  defer.extendQuery(qb, schema);
  order.extendQuery(qb, schema);
  joins.extendQuery(qb, schema);
  upsert.extendQuery(qb, schema);

  // Custom qb extensions
  return _.extend(qb, schema.queries);
}

module.exports = {
  generate: generate
}
