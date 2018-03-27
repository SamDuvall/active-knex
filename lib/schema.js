var _ = require('underscore')
var Promise = require('bluebird')
var Fields = require('./schema/fields')
var Query = require('./query')
var util = require('./util')

// User defined schema
function Schema (tableName) {
  this.tableName = tableName
}

// Define the prototype for the schema
_.extend(Schema.prototype, {
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
      return _.extend(object, attr)
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
    var schema = this
    var fields = this.fields

    // If no entries, then do nothing
    var entries = util.arrayify(data)
    if (entries.length === 0) return Promise.resolve(entries)

    // Ensure each entry has create/update times
    var createdAt = new Date()
    _.each(entries, function (entry) {
      if (fields.createdAt && entry.createdAt === undefined) entry.createdAt = createdAt
      if (fields.updatedAt && entry.updatedAt === undefined) entry.updatedAt = createdAt
    })

    var insertAndSelect = _.isArray(data) ? schema.bulkInsertAndSelect : schema.insertAndSelect
    return insertAndSelect.call(schema, data, trx).then(function (rows) { // Return object or array
      return _.isArray(data) ? rows : _.first(rows)
    })
  },

  // Buffer creates into one batch, so they can occur all as once, but seem individual
  bufferCreate: function (params, trx) {
    var schema = this

    // New buffer
    if (!schema._batch) {
      // Initialize the buffer
      schema._batch = []

      // Create the timer for next tick
      setTimeout(function () {
        var batchParams = _.pluck(schema._batch, 'params')
        schema.create(batchParams, trx).then(function (rows) {
          _.each(schema._batch, function (entry, index) {
            entry.resolve(rows[index])
          })
        }).catch(function (err) {
          _.each(schema._batch, function (entry, index) {
            entry.reject(err)
          })
        }).finally(function () {
          schema._batch = undefined
        })
      })
    }

    // Promise to resolve
    return new Promise(function (resolve, reject) {
      schema._batch.push({
        params: params,
        resolve: resolve,
        reject: reject
      })
    })
  },

  // Insert data and then return the data inserted
  insertAndSelect: function (data, trx) {
    var schema = this
    var entries = util.arrayify(data)
    return schema.transacting(trx).insert(data).then(function (result) { // Query the rows back
      var id = _.first(result)
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
    var schema = this
    var batch = _.first(entries, schema.insertMaxLength)
    var remaining = _.rest(entries, batch.length)

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
    var schema = this
    var fields = this.fields

    // If no changes, do nothing
    var isChanges = _.keys(changes).length > 0
    if (!isChanges) return Promise.resolve(data)

    // Update updated_at, if necessary
    var updatedAt = new Date()
    if (fields.updatedAt && changes.updatedAt === undefined) changes.updatedAt = updatedAt

    // Perform the update
    var where = {}
    where[schema.primaryKey] = data[schema.primaryKey]
    return schema.transacting(trx).where(where).update(changes).then(function () {
      return _.extend(data, changes)
    })
  },

  // Find the row that matches these params, or create it
  // Only find using keys
  findOrCreate: function (data, trx) {
    var schema = this
    var search = this.keys ? _.pick(data, this.keys) : _.keys(data)
    return schema.where(search).transacting(trx).first().then(function (row) {
      return row || schema.create(data, trx)
    })
  },

  // Update the row that matches these params, or create it
  // Only find using keys
  updateOrCreate: function (data, trx) {
    var schema = this
    var search = this.keys ? _.pick(data, this.keys) : _.keys(data)
    var values = _.omit(data, this.keys)
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
    var relations = this.relations

    // Pull off the data to load into
    var firstArg = _.first(arguments)
    var rows = util.arrayify(firstArg)

    // Pull off a transaction (if present)
    var lastArg = _.last(arguments)
    if (_.isFunction(lastArg)) var trx = lastArg

    // Pull off the names
    var names = _.filter(arguments, _.isString)

    // Find primary relations (e.g. 'teams')
    var primary = _.chain(names).map(function (name) {
      return _.first(name.split('.'))
    }).uniq().value()
    // Load the primary relations
    return Promise.each(primary, function (name) {
      var relation = relations[name]()
      return relation.load(rows, name, trx)
    }).then(function () {
      // Find secondary relations (e.g. 'teams.owner')
      var secondary = _.reject(names, function (name) {
        return name.split('.').length === 1
      })
      // Load secondary relations
      return Promise.each(secondary, function (name) {
        var names = name.split('.')
        var through = _.first(names)
        name = _.rest(names).join('.')

        var relation = relations[through]()
        var subRows = _.chain(rows).pluck(through).flatten().value()
        return relation.model.load(subRows, name, trx)
      })
    }).return(data)
  }
})

// Allow user to define custom fields
Schema.fields = Fields.known

// Create a new schema
Schema.create = function (knex, options) {
  // Create schema
  var schema = new Schema(options.tableName)
  schema.primaryKey = options.primaryKey || 'id'
  schema.keys = options.keys || []
  schema.fields = Fields.mapSchema(options.fields)
  schema.joins = options.joins || {}
  schema.orders = options.orders || {}
  schema.queries = options.queries || {}
  schema.relations = options.relations || {}
  schema.query = _.partial(Query.generate, knex, schema)
  schema.raw = _.bind(knex.raw, knex)
  schema.transaction = _.bind(knex.transaction, knex)
  schema.insertMaxLength = options.insertMaxLength || 1000

  // Add to joins table for the connection
  knex.joins = knex.joins || {}
  knex.joins[schema.tableName] = schema.joins

  return schema
}

module.exports = Schema
