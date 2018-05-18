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

const DEFAULT_OPTIONS = {
  primaryKey: 'id'
}

class Schema {
  // Create a new schema
  static create (knex, options) {
    return new Schema(knex, options)
  }

  constructor (knex, options) {
    Object.assign(this, DEFAULT_OPTIONS, options)
    this.fields = Fields.mapSchema(this.fields)
    this.query = Query.generate.bind(null, knex, this)
    this.raw = knex.raw.bind(knex)
    this.transaction = knex.transaction.bind(knex)

    // Add to joins table for the connection
    knex.joins = knex.joins || {}
    knex.joins[this.tableName] = this.joins
  }

  // Create a where shortcut that creates a query and starts with this transaction
  transacting (trx) {
    return this.query().transacting(trx)
  }

  // Create a where shortcut that creates a query and starts with where
  where () {
    const query = this.query()
    return query.where.apply(query, arguments)
  }

  // Reload attributes onto the object
  reload (object, trx) {
    const id = object[this.primaryKey]
    return this.findById(id, trx).then(function (attr) {
      return Object.assign(object, attr)
    })
  }

  // BY ID --------------------------------------------------------------------

  // Find a row by the primaryKey field
  findById (id, trx) {
    const where = {}
    where[this.primaryKey] = id
    return this.transacting(trx).where(where).first()
  }

  // Remove a remove by the primaryKey field
  removeById (id, trx) {
    const where = {}
    where[this.primaryKey] = id
    return this.transacting(trx).where(where).delete()
  }

  // UPDATE / CREATE ----------------------------------------------------------

  // Create single OR multiple rows of data
  create (data, trx) {
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

    const insertAndSelect = isArray(data) ? this.bulkInsertAndSelect : this.insertAndSelect
    return insertAndSelect.call(this, data, trx).then((rows) => { // Return object or array
      return isArray(data) ? rows : first(rows)
    })
  }

  // Insert data and then return the data inserted
  insertAndSelect (data, trx) {
    const { primaryKey } = this
    const entries = util.arrayify(data)
    return this.transacting(trx).insert(data).then((result) => { // Query the rows back
      const id = first(result)
      const qb = this.transacting(trx)
      if (result.length > 1) { // PostgreSQL gives back all the ids
        return qb.whereIn(primaryKey, result)
      } else if (id === 0) { // No id? Return most recent rows
        return qb.orderBy(primaryKey, 'desc').limit(entries.length)
      } else if (entries.length === 1) { // Know the single ID?
        return qb.where(primaryKey, id)
      } else { // Know the start ID?
        return qb.where(primaryKey, '>=', id).where(primaryKey, '<=', id + entries.length - 1)
      }
    })
  }

  // Bulk insert the data in batches, to not overflow the pools/sql bounds
  bulkInsertAndSelect (entries, trx) {
    // Determine the next batch
    const { insertMaxLength = 1000 } = this
    const batch = take(entries, insertMaxLength)
    const remaining = drop(entries, batch.length)

    // If the batch is empty, move on
    if (!batch.length) return Promise.resolve(batch)

    // Run the next batch
    return this.insertAndSelect(batch, trx).then((batchRows) => {
      return this.bulkInsertAndSelect(remaining, trx).then((remainingRows) => {
        return batchRows.concat(remainingRows)
      })
    })
  }

  // Update this data (must have id)
  update (data, changes, trx) {
    const { fields, primaryKey } = this

    // If no changes, do nothing
    const isChanges = Object.keys(changes).length > 0
    if (!isChanges) return Promise.resolve(data)

    // Update updated_at, if necessary
    const updatedAt = new Date()
    if (fields.updatedAt && changes.updatedAt === undefined) changes.updatedAt = updatedAt

    // Perform the update
    const where = {}
    where[primaryKey] = data[primaryKey]
    return this.transacting(trx).where(where).update(changes).then(() => {
      return Object.assign(data, changes)
    })
  }

  // Find the row that matches these params, or create it
  // Only find using keys
  findOrCreate (data, trx) {
    const search = this.keys ? pick(data, this.keys) : Object.keys(data)
    return this.where(search).transacting(trx).first().then((row) => {
      return row || this.create(data, trx)
    })
  }

  // Update the row that matches these params, or create it
  // Only find using keys
  updateOrCreate (data, trx) {
    const search = this.keys ? pick(data, this.keys) : Object.keys(data)
    const values = omit(data, this.keys)
    return this.transacting(trx).where(search).first().then((row) => {
      return row ? this.update(row, values, trx) : this.create(data, trx)
    })
  }

  // RELATIONS ----------------------------------------------------------------

  // Load the given relations onto the data
  // (first parameter - required) - object OR array to load relations ONTO
  // (remaining parameters) - list of relations to load
  // (last parameter - optional) - transaction to with
  load (data) {
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
}

Schema.fields = Fields.known

module.exports = Schema
