var Promise = require('bluebird')

// Extend the query builder
function extendQuery (qb) {
  // Create list of operations that should run right before the query
  var deferreds = []
  qb.defer = function (callback) {
    deferreds.push(callback)
    return this
  }

  // Run our deferred functions before executing
  var then = qb.then
  qb.then = function (onFulfilled, onRejected) {
    return Promise.each(deferreds, function (deferred) {
      return deferred(qb)
    }, onRejected).then(function () {
      return then.call(qb, onFulfilled, onRejected)
    })
  }

  return qb
}

module.exports = {
  extendQuery: extendQuery
}
