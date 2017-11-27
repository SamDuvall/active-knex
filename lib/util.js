var _ = require('underscore');
var _str = require('underscore.string');

// Turn whatever this value is into an array
function arrayify(value) {
  if (value === undefined) return [];
  else if (_.isArray(value)) return value;
  else return [value];
}

// Parse this column for ordering
function parseColumn(column) {
  var desc = column[0] === '-';
  return {
    column: desc ? column.substr(1) : column,
    desc: desc
  }
}

// Map attributes from snake_case to lowerCamelCase
function toLowerCamelCase(attr) {
  if (_.isArray(attr)) return _.map(attr, toLowerCamelCase);

  return _.reduce(attr, function(memo, val, key) {
    key = _str.camelize(key);
    memo[key] = val;
    return memo;
  }, {});
}

// Convert all parameters from lowerCamelCase to snake_case
const CAMEL_REGEX = /[a-z][a-z0-9]*[A-Z]+[\w\d]*/g;
function toSnakeCase(sql) {
  var match;
  while (match = CAMEL_REGEX.exec(sql)) {
    var camel = match[0];
    var before = sql.substr(0, match.index);
    var snake = _str.underscored(match[0]);
    var after = sql.substr(match.index + camel.length, sql.length);
    sql = before + snake + after;
  }
  return sql;
}

const QUOTES_REGEX = /"(?:\\.|[^"\\])*"/
function toSqlSnakeCase(sql) {
  var result = '';
  var match;
  while (match = sql.match(QUOTES_REGEX)) {
    var before = sql.slice(0, match.index);
    result += toSnakeCase(before) + match[0]
    sql = sql.slice(match.index + match[0].length);
  }
  result += toSnakeCase(sql)
  return result;
}

module.exports = {
  arrayify,
  parseColumn,
  toLowerCamelCase,
  toSnakeCase,
  toSqlSnakeCase
};
