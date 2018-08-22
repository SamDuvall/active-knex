const each = require('lodash/each')
const find = require('lodash/find')
const get = require('lodash/get')
const isString = require('lodash/isString')
const pick = require('lodash/pick')
const KnexQueryBuilder = require('knex/lib/query/builder')
const { mapFieldToDb, mapFieldsFromDb, mapFieldsToDb } = require('./fields')
const { orderAfter, orderBy } = require('./sort')
const { arrayify } = require('./util')
const SELECT_METHODS = ['select', 'first']

const OPTIONS = ['fields', 'primaryKey', 'tableName']

class QueryBuilder extends KnexQueryBuilder {
  constructor (client, options) {
    super(client)
    options = pick(options, OPTIONS)
    Object.assign(this, options)
  }

  clone () {
    const qb = super.clone()
    const options = pick(this, OPTIONS)
    return Object.assign(qb, options)
  }

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  insert (data, returning) {
    data = arrayify(data).map(row => mapFieldsToDb(this.fields, row))
    return super.insert(data, returning)
  }

  // Update a row in the table by converting the fields
  update (values) {
    if (isString(values)) { // qb.update(field, value, returning)
      const field = this.fields[values]
      const value = mapFieldToDb(field, arguments[1])
      return super.update(values, value, arguments[2])
    } else { // qb.update(values, returning)
      values = mapFieldsToDb(this.fields, values)
      return super.update(values, arguments[1])
    }
  }

  // Override then to format the result
  then (onFulfilled, onRejected) {
    return super.then((result) => {
      const method = this._method || 'select'
      const isSelect = SELECT_METHODS.includes(method)
      if (isSelect && result) result = mapFieldsFromDb(this.fields, result)
      return onFulfilled(result)
    }, onRejected)
  }

  // Convience function to join known tables together
  joins () {
    each(arguments, (name) => {
      // Go through the dots
      let from = this.tableName
      name.split('.').forEach((to) => {
        if (!find(this.joined, {from, to})) {
          const joinsFrom = QueryBuilder.joins[from]
          const join = get(joinsFrom, to)
          if (!join) throw new Error(`No join from ${from} to ${to}`)

          // Perform the join
          join(this)

          // Add to joined list
          this.joined = this.joined || []
          this.joined.push({from, to})
        }

        from = to
      })
    })
    return this
  }

  // Allow multiple order bys in array desc via '-column_name'
  orderBy (order) {
    // Base call
    if (arguments.length === 2) return super.orderBy.apply(this, arguments)

    // Custom call
    return orderBy(this, order)
  }

  // Get the entries after the sort key provided in the order
  after (order, sortKey) {
    let orders = arrayify(order)

    const { primaryKey, tableName } = this
    const primaryKeyOrder = `${tableName}.${primaryKey}`
    if (!orders.includes(primaryKeyOrder)) {
      orders = [...orders, primaryKeyOrder]
    }

    return orderAfter(this, orders, sortKey)
  }
}

QueryBuilder.joins = {}

module.exports = QueryBuilder
