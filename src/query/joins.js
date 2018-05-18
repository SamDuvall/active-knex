const each = require('lodash/each')
const find = require('lodash/find')

const isJoined = (qb, from, to) => !!find(qb.joined, {from, to})

const addJoined = (qb, from, to) => {
  qb.joined = qb.joined || []
  qb.joined.push({from, to})
}

// Extend the query builder
module.exports = (qb, schema, joins) => {
  // Joins each table defined in the arguments
  qb.joins = function () {
    each(arguments, (name) => {
      // Go through the dots
      let from = schema.tableName
      name.split('.').forEach((to) => {
        if (!isJoined(qb, from, to)) {
          var joinsFrom = joins[from]
          if (joinsFrom) var join = joinsFrom[to]
          if (!join) throw ['No join from', from, 'to', to].join(' ')

          join(qb)
          addJoined(qb, from, to)
        }

        from = to
      })
    })

    return qb
  }
}
