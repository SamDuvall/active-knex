const camelCase = require('lodash/camelCase')
const isArray = require('lodash/isArray')
const reduce = require('lodash/reduce')
const underscored = require('underscore.string/underscored')

// Turn whatever this value is into an array
function arrayify (value) {
  if (value === undefined) return []
  else if (isArray(value)) return value
  else return [value]
}

// Parse this column for ordering
function parseColumn (column) {
  var desc = column[0] === '-'
  return {
    column: desc ? column.substr(1) : column,
    desc: desc
  }
}

// Map attributes from snake_case to lowerCamelCase
function toLowerCamelCase (attr) {
  if (isArray(attr)) return attr.map(toLowerCamelCase)

  return reduce(attr, function (memo, val, key) {
    key = camelCase(key)
    memo[key] = val
    return memo
  }, {})
}

// Convert all parameters from lowerCamelCase to snake_case
const CAMEL_REGEX = /[a-z][a-z0-9]*[A-Z]+[\w\d]*/g
function toSnakeCase (sql) {
  var match
  while (match = CAMEL_REGEX.exec(sql)) { // eslint-disable-line no-cond-assign
    var camel = match[0]
    var before = sql.substr(0, match.index)
    var snake = underscored(match[0])
    var after = sql.substr(match.index + camel.length, sql.length)
    sql = before + snake + after
  }
  return sql
}

const QUOTES_REGEX = /"(?:\\.|[^"\\])*"/
function toSqlSnakeCase (sql) {
  var result = ''
  var match
  while (match = sql.match(QUOTES_REGEX)) { // eslint-disable-line no-cond-assign
    var before = sql.slice(0, match.index)
    result += toSnakeCase(before) + match[0]
    sql = sql.slice(match.index + match[0].length)
  }
  result += toSnakeCase(sql)
  return result
}

module.exports = {
  arrayify,
  parseColumn,
  toLowerCamelCase,
  toSnakeCase,
  toSqlSnakeCase
}
