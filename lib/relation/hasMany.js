const camelCase = require('lodash/camelCase')
const map = require('lodash/map')
const uniq = require('lodash/uniq')

class HasMany {
  query (ids, trx) {
    return this.model.transacting(trx).whereIn(this.foreignKey, ids)
  }

  load (rows, name, trx) {
    const key = this.key ? camelCase(this.key) : 'id'
    const foreignKey = camelCase(this.foreignKey)
    const ids = uniq(map(rows, key))
    return this.query(ids, trx).then((results) => {
      rows.forEach((row) => {
        row[name] = results.filter(result => result[foreignKey] === row[key])
      })
    })
  }
}

module.exports = (options) => Object.assign(new HasMany(), options)
