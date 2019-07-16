const underscored = require('underscore.string/underscored')
const { arrayify, parseColumn } = require('./util')

// Allow multiple order bys in array desc via '-column_name'
const orderBy = (qb, order) => {
  const orders = arrayify(order)
  orders.forEach((order) => {
    const { column, desc } = parseColumn(order)
    qb.orderBy(column, desc ? 'desc' : 'asc')
  })
  return qb
}

// Get the entries after the sort key provided in the order
const orderAfter = (qb, order, sortKey) => {
  const orders = arrayify(order)

  if (sortKey) {
    const str = Buffer.from(sortKey, 'base64').toString('utf8')
    const sortKeys = JSON.parse(str)
    whereOrders(qb, orders, sortKeys)
  }

  const columns = orders.map(parseColumn).map(col => col.column).map(underscored)
  const select = qb.client.raw(`TO_BASE64(JSON_ARRAY(${columns.join(',')})) AS sort_key`)
  return orderBy(qb, orders).select(select)
}

const whereOrders = (qb, orders, sortKeys) => {
  if (orders.length !== sortKeys.length) throw new Error('Invalid Sort Keys')

  const [order, ...restOrders] = orders
  const [sortKey, ...restSortKeys] = sortKeys
  const { column, desc } = parseColumn(order)

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
          whereOrders(nextQb, restOrders, restSortKeys)
        })
      }
    } else {
      if (desc) {
        qb.whereNull(column)
        whereOrders(qb, restOrders, restSortKeys)
      } else {
        qb.whereNotNull(column)
        if (restOrders.length) {
          qb.orWhere((nextQb) => {
            qb.whereNull(column)
            whereOrders(nextQb, restOrders, restSortKeys)
          })
        }
      }
    }
  })
}

module.exports = { orderAfter, orderBy }
