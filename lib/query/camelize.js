var _ = require('underscore');
var _str = require('underscore.string');

// Convert all parameters from lowerCamelCase to snake_case
var camelRegEx = /[a-z][a-z0-9]*[A-Z]+[\w\d]*/g;
function toSnakeCase(sql) {
  var match;
  while (match = camelRegEx.exec(sql)) {
    var camel = match[0];
    var before = sql.substr(0, match.index);
    var snake = _str.underscored(match[0]);
    var after = sql.substr(match.index + camel.length, sql.length);
    sql = before + snake + after;
  }
  return sql;
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

// Extend the query builder
function extendQuery(qb) {
  // Override the QueryCompiler toSQL function to format the SQL string going down
  var toSQL = qb.toSQL;
  qb.toSQL = function() {
    var result = toSQL.apply(qb, arguments);
    result.sql = toSnakeCase(result.sql);
    return result;
  };

  // Override then to format the result
  var then = qb.then;
  qb.then = function(onFulfilled, onRejected) {
    return then.call(qb, function(result) {
      var method = qb._method || 'select';
      var isSelect = _.include(['select', 'first'], method);
      if (isSelect && result) result = toLowerCamelCase(result);
      return onFulfilled(result);
    }, onRejected);
  };

  return qb;
}

module.exports = {
  extendQuery: extendQuery,
  toLowerCamelCase: toLowerCamelCase,
  toSnakeCase: toSnakeCase
};
