const underscored = require('underscore.string/underscored')
const Order = require('./order')
const { arrayify } = require('./util')

// Allow multiple order bys in array desc via '-column_name'
const orderBy = (qb, order) => {
  const orders = arrayify(order).map(Order.fromString)
  return orders.reduce((qb, order) => qb.orderByRaw(order.toString()), qb)
}

// Get the entries after the sort key provided in the order
const orderAfter = (qb, order, sortKey) => {
  const orders = arrayify(order)

  if (sortKey) {
    const str = Buffer.from(sortKey, 'base64').toString('utf8')
    const sortKeys = JSON.parse(str)
    whereOrders(qb, orders, sortKeys)
  }

  const columns = orders.map(Order.fromString).map(col => col.column).map(underscored)
  const select = qb.client.raw(`TO_BASE64(JSON_ARRAY(${columns.join(',')})) AS sort_key`)
  return orderBy(qb, orders).select(select)
}

const whereOrders = (qb, orders, sortKeys) => {
  if (orders.length !== sortKeys.length) throw new Error('Invalid Sort Keys')

  const [order, ...restOrders] = orders
  const [sortKey, ...restSortKeys] = sortKeys
  const { column, isDesc, isReversed } = Order.fromString(order)
  const areNullsFirst = (isDesc && !isReversed) || (!isDesc && isReversed)

  qb.where((qb) => {
    if (sortKey !== null) {
      if (isDesc) {
        qb.where(column, '<', sortKey)
      } else {
        qb.where(column, '>', sortKey)
      }

      if (areNullsFirst) {
        qb.orWhereNull(column)
      }

      if (restOrders.length) {
        qb.orWhere((nextQb) => {
          nextQb.where(column, '=', sortKey)
          whereOrders(nextQb, restOrders, restSortKeys)
        })
      }
    } else {
      if (areNullsFirst) {
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
