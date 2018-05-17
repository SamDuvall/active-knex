const isString = require('lodash/isString')
const Fields = require('../schema/fields')
const util = require('../util')
const SELECT_METHODS = ['select', 'first']

// Extend the query builder
module.exports = (qb, schema) => {
  const mapFieldsFromDb = Fields.mapFieldsFromDb.bind(null, schema.fields)
  const mapFieldsToDb = Fields.mapFieldsToDb.bind(null, schema.fields)

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  const { insert } = qb
  qb.insert = function (data, returning) {
    data = util.arrayify(data)
    data = data.map(mapFieldsToDb)
    return insert.call(qb, data, returning)
  }

  // Update a row in the table by converting the fields
  const { update } = qb
  qb.update = function (values) {
    if (isString(values)) { // qb.update(field, value, returning)
      var field = schema.fields[values]
      var value = Fields.mapFieldToDb(field, arguments[1])
      return update.call(qb, values, value, arguments[2])
    } else { // qb.update(values, returning)
      values = mapFieldsToDb(values)
      return update.call(qb, values, arguments[1])
    }
  }

  // Override then to format the result
  const { then } = qb
  qb.then = function (onFulfilled, onRejected) {
    return then.call(qb, function (result) {
      const method = qb._method || 'select'
      const isSelect = SELECT_METHODS.includes(method)
      if (isSelect && result) result = mapFieldsFromDb(result)
      return onFulfilled(result)
    }, onRejected)
  }
}
