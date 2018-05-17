const drop = require('lodash/drop')
const filter = require('lodash/filter')
const first = require('lodash/first')
const flatMap = require('lodash/flatMap')
const isArray = require('lodash/isArray')
const isFunction = require('lodash/isFunction')
const isString = require('lodash/isString')
const last = require('lodash/last')
const omit = require('lodash/omit')
const pick = require('lodash/pick')
const take = require('lodash/take')
const uniq = require('lodash/uniq')

const Promise = require('bluebird')
const Fields = require('./schema/fields')
const Query = require('./query')
const util = require('./util')

// User defined schema
function Schema (tableName) {
  this.tableName = tableName
}

// Define the prototype for the schema
Object.assign(Schema.prototype, {
  // SHORTCUTS ----------------------------------------------------------------

  // Create a where shortcut that creates a query and starts with this transaction
  transacting: function (trx) {
    return this.query().transacting(trx)
  },

  // Create a where shortcut that creates a query and starts with where
  where: function () {
    var query = this.query()
    return query.where.apply(query, arguments)
  },

  // Reload attributes onto the object
  reload: function (object, trx) {
    var id = object[this.primaryKey]
    return this.findById(id, trx).then(function (attr) {
      return Object.assign(object, attr)
    })
  },

  // BY ID --------------------------------------------------------------------

  // Find a row by the primaryKey field
  findById: function (id, trx) {
    var where = {}
    where[this.primaryKey] = id
    return this.transacting(trx).where(where).first()
  },

  // Remove a remove by the primaryKey field
  removeById: function (id, trx) {
    var where = {}
    where[this.primaryKey] = id
    return this.transacting(trx).where(where).delete()
  },

  // UPDATE / CREATE ----------------------------------------------------------

  // Create single OR multiple rows of data
  create: function (data, trx) {
    const schema = this
    const { fields } = this

    // If no entries, then do nothing
    const entries = util.arrayify(data)
    if (entries.length === 0) return Promise.resolve(entries)

    // Ensure each entry has create/update times
    const createdAt = new Date()
    entries.forEach((entry) => {
      if (fields.createdAt && entry.createdAt === undefined) entry.createdAt = createdAt
      if (fields.updatedAt && entry.updatedAt === undefined) entry.updatedAt = createdAt
    })

    const insertAndSelect = isArray(data) ? schema.bulkInsertAndSelect : schema.insertAndSelect
    return insertAndSelect.call(schema, data, trx).then(function (rows) { // Return object or array
      return isArray(data) ? rows : first(rows)
    })
  },

  // Insert data and then return the data inserted
  insertAndSelect: function (data, trx) {
    var schema = this
    var entries = util.arrayify(data)
    return schema.transacting(trx).insert(data).then(function (result) { // Query the rows back
      var id = first(result)
      var qb = schema.transacting(trx)
      if (result.length > 1) { // PostgreSQL gives back all the ids
        return qb.whereIn(schema.primaryKey, result)
      } else if (id === 0) { // No id? Return most recent rows
        return qb.orderBy(schema.primaryKey, 'desc').limit(entries.length)
      } else if (entries.length === 1) { // Know the single ID?
        return qb.where(schema.primaryKey, id)
      } else { // Know the start ID?
        return qb.where(schema.primaryKey, '>=', id).where(schema.primaryKey, '<=', id + entries.length - 1)
      }
    })
  },

  // Bulk insert the data in batches, to not overflow the pools/sql bounds
  bulkInsertAndSelect: function (entries, trx) {
    // Determine the next batch
    const schema = this
    const batch = take(entries, schema.insertMaxLength)
    const remaining = drop(entries, batch.length)

    // If the batch is empty, move on
    if (!batch.length) return Promise.resolve(batch)

    // Run the next batch
    return schema.insertAndSelect(batch, trx).then(function (batchRows) {
      return schema.bulkInsertAndSelect(remaining, trx).then(function (remainingRows) {
        return batchRows.concat(remainingRows)
      })
    })
  },

  // Update this data (must have id)
  update: function (data, changes, trx) {
    const schema = this
    const { fields } = this

    // If no changes, do nothing
    const isChanges = Object.keys(changes).length > 0
    if (!isChanges) return Promise.resolve(data)

    // Update updated_at, if necessary
    const updatedAt = new Date()
    if (fields.updatedAt && changes.updatedAt === undefined) changes.updatedAt = updatedAt

    // Perform the update
    const where = {}
    where[schema.primaryKey] = data[schema.primaryKey]
    return schema.transacting(trx).where(where).update(changes).then(function () {
      return Object.assign(data, changes)
    })
  },

  // Find the row that matches these params, or create it
  // Only find using keys
  findOrCreate: function (data, trx) {
    var schema = this
    var search = this.keys ? pick(data, this.keys) : Object.keys(data)
    return schema.where(search).transacting(trx).first().then(function (row) {
      return row || schema.create(data, trx)
    })
  },

  // Update the row that matches these params, or create it
  // Only find using keys
  updateOrCreate: function (data, trx) {
    const schema = this
    const search = this.keys ? pick(data, this.keys) : Object.keys(data)
    const values = omit(data, this.keys)
    return schema.transacting(trx).where(search).first().then(function (row) {
      return row ? schema.update(row, values, trx) : schema.create(data, trx)
    })
  },

  // RELATIONS ----------------------------------------------------------------

  // Load the given relations onto the data
  // (first parameter - required) - object OR array to load relations ONTO
  // (remaining parameters) - list of relations to load
  // (last parameter - optional) - transaction to with
  load: function (data) {
    const { relations } = this

    // Pull off the data to load into
    const firstArg = first(arguments)
    const rows = util.arrayify(firstArg)

    // Pull off a transaction (if present)
    const lastArg = last(arguments)
    if (isFunction(lastArg)) var trx = lastArg

    // Pull off the names
    const names = filter(arguments, isString)

    // Load the primary relations (e.g. 'teams')
    const primaries = names.map(name => first(name.split('.')))
    return Promise.each(uniq(primaries), (name) => {
      const relation = relations[name]()
      return relation.load(rows, name, trx)
    }).then(() => {
      // Load secondary relations (e.g. 'teams.owner')
      const secondary = names.filter(name => name.split('.').length > 1)
      return Promise.each(secondary, function (name) {
        const [through, ...next] = name.split('.')
        const nextName = rest.join('.')

        const relation = relations[through]()
        const subRows = flatMap(rows, through)
        return relation.model.load(subRows, nextName, trx)
      })
    }).return(data)
  }
})

// Allow user to define custom fields
Schema.fields = Fields.known

// Create a new schema
Schema.create = function (knex, options) {
  // Create schema
  const schema = new Schema(options.tableName)
  schema.primaryKey = options.primaryKey || 'id'
  schema.keys = options.keys || []
  schema.fields = Fields.mapSchema(options.fields)
  schema.joins = options.joins || {}
  schema.orders = options.orders || {}
  schema.queries = options.queries || {}
  schema.relations = options.relations || {}
  schema.query = Query.generate.bind(null, knex, schema)
  schema.raw = knex.raw.bind(knex)
  schema.transaction = knex.transaction.bind(knex)
  schema.insertMaxLength = options.insertMaxLength || 1000

  // Add to joins table for the connection
  knex.joins = knex.joins || {}
  knex.joins[schema.tableName] = schema.joins

  return schema
}

module.exports = Schema
