const camelCase = require('lodash/camelCase')
const map = require('lodash/map')
const uniq = require('lodash/uniq')

class BelongsTo {
  query (ids, trx) {
    return this.model.transacting(trx).whereIn('id', ids)
  }

  load (rows, name, trx) {
    const key = this.key ? camelCase(this.key) : 'id'
    const foreignKey = camelCase(this.foreignKey)
    const ids = uniq(map(rows, foreignKey))
    return this.query(ids, trx).then((results) => {
      rows.forEach((row) => {
        row[name] = results.find(result => result[key] === row[foreignKey])
      })
    })
  }
}

module.exports = (options) => Object.assign(new BelongsTo(), options)
