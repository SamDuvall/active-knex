var _ = require('underscore')
var util = require('../util')

// Extend the query builder
function extendQuery (qb) {
  // Override the QueryCompiler toSQL function to format the SQL string going down
  var toSQL = qb.toSQL
  qb.toSQL = function () {
    var result = toSQL.apply(qb, arguments)
    result.sql = util.toSqlSnakeCase(result.sql)
    return result
  }

  // Override then to format the result
  var then = qb.then
  qb.then = function (onFulfilled, onRejected) {
    return then.call(qb, function (result) {
      var method = qb._method || 'select'
      var isSelect = _.include(['select', 'first'], method)
      if (isSelect && result) result = util.toLowerCamelCase(result)
      return onFulfilled(result)
    }, onRejected)
  }

  return qb
}

module.exports = {
  extendQuery: extendQuery
}
