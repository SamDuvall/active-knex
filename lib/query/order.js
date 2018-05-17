const { arrayify, parseColumn } = require('../util')

// Extend the query builder
function extendQuery (qb, schema) {
  // Override the orderBy to prepend a '-' to switch to DESC
  const { orderBy } = qb
  qb.orderBy = function (order) {
    // Base call
    if (arguments.length === 2) orderBy.apply(this, arguments)

    // Custom call
    const orders = arrayify(order)
    orders.forEach((order) => {
      const { column, desc } = parseColumn(order)
      return orderBy.call(this, column, desc ? 'desc' : 'asc')
    })
    return this
  }

  // Get the entries after the last value in the order provided
  // NOTE: This is for infinite scrolling
  qb.after = function (order, sortKey) {
    const orders = [...arrayify(order), 'id']

    if (sortKey) {
      const ascii = Buffer.from(sortKey, 'base64').toString('ascii')
      const sortKeys = JSON.parse(ascii)
      whereSortOrders(this, orders, sortKeys)
    }

    const columns = orders.map(parseColumn).map(col => col.column)
    const select = schema.raw(`TO_BASE64(JSON_ARRAY(${columns.join(',')})) AS sort_key`)
    return this.orderBy(orders).select(select)
  }

  return qb
}

const whereSortOrders = (qb, orders, sortKeys) => {
  if (orders.length !== sortKeys.length) throw new Error('Invalid Sort Keys')

  const [ order, ...restOrders ] = orders
  const [ sortKey, ...restSortKeys ] = sortKeys
  const { column, desc } = parseColumn(order)
  // console.log('order', order)
  // console.log('sortKey', sortKey)

  qb.where((qb) => {
    if (sortKey !== null) {
      if (desc) {
        qb.where(column, '<', sortKey)
        qb.orWhereNull(column)
      } else {
        qb.where(column, '>', sortKey)
      }

      if (restOrders.length) {
        qb.orWhere((nextQb) => {
          nextQb.where(column, '=', sortKey)
          whereSortOrders(nextQb, restOrders, restSortKeys)
        })
      }
    } else {
      if (desc) {
        qb.whereNull(column)
        whereSortOrders(qb, restOrders, restSortKeys)
      } else {
        qb.whereNotNull(column)
        if (restOrders.length) {
          qb.orWhere((nextQb) => {
            qb.whereNull(column)
            whereSortOrders(nextQb, restOrders, restSortKeys)
          })
        }
      }
    }
  })

  return qb
}

module.exports = {
  extendQuery
}
