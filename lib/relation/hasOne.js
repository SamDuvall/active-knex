var _ = require('underscore')
var _str = require('underscore.string')

function HasOne (options) {
  _.extend(this, options)
}

_.extend(HasOne.prototype, {
  query: function (ids, trx) {
    return this.model.transacting(trx).whereIn(this.foreignKey, ids)
  },

  load: function (rows, name, trx) {
    var key = this.key ? _str.camelize(this.key) : 'id'
    var foreignKey = _str.camelize(this.foreignKey)
    var ids = _.chain(rows).pluck(key).uniq().value()
    return this.query(ids, trx).then(function (results) {
      _.each(rows, function (row) {
        row[name] = _.find(results, function (result) {
          return result[foreignKey] === row[key]
        })
      })
    })
  }
})

module.exports = function (options) {
  return new HasOne(options)
}
