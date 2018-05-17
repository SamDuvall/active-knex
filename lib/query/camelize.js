const { toLowerCamelCase, toSqlSnakeCase } = require('../util')
const SELECT_METHODS = ['select', 'first']

module.exports = (qb) => {
  // Override the QueryCompiler toSQL function to format the SQL string going down
  const { toSQL } = qb
  qb.toSQL = function () {
    const result = toSQL.apply(qb, arguments)
    result.sql = toSqlSnakeCase(result.sql)
    return result
  }

  // Override then to format the result
  const { then } = qb
  qb.then = function (onFulfilled, onRejected) {
    return then.call(qb, function (result) {
      const method = qb._method || 'select'
      const isSelect = SELECT_METHODS.includes(method)
      if (isSelect && result) result = toLowerCamelCase(result)
      return onFulfilled(result)
    }, onRejected)
  }
}
