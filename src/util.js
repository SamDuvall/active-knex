const camelCase = require('lodash/camelCase')
const isArray = require('lodash/isArray')
const isObject = require('lodash/isObject')
const mapKeys = require('lodash/mapKeys')
const underscored = require('underscore.string/underscored')

// Turn whatever this value is into an array
const arrayify = (value) => {
  if (value === undefined) return []
  else if (isArray(value)) return value
  else return [value]
}

// Parse this column for ordering
const parseColumn = (column) => {
  const desc = column[0] === '-'
  return {
    column: desc ? column.substr(1) : column,
    desc
  }
}

// snake_case to camelCase
const toCamelCase = (value) => camelCase(value)
const camelizeKeys = (object) => mapKeys(object, (value, key) => toCamelCase(key))
const postProcessRow = (row) => isObject(row) ? camelizeKeys(row) : row
const postProcessResponse = (result, queryContext) => {
  if (!result) return
  return isArray(result) ? result.map(postProcessRow) : postProcessRow(result)
}

// camelCase to snake_case
const toSnakeCase = (value) => underscored(value)
const wrapIdentifier = (value, origImpl, queryContext) => {
  if (value !== '*') value = toSnakeCase(value)
  return origImpl(value)
}

module.exports = {
  arrayify,
  parseColumn,

  postProcessResponse,
  wrapIdentifier
}
