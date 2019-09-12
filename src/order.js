const underscored = require('underscore.string/underscored')

class Order {
  static fromJSON (json) {
    return Object.assign(new Order(), json)
  }

  static fromString (string) {
    const parts = string.split(' ')
    if (parts.length === 2) {
      const [firstPart, order] = parts
      const isReversed = firstPart[0] === '-'
      const column = isReversed ? firstPart.substr(1) : firstPart
      return Order.fromJSON({ column, isReversed, order })
    } else if (parts.length === 1) {
      const isDesc = string[0] === '-'
      const column = isDesc ? string.substr(1) : string
      const order = isDesc ? 'DESC' : 'ASC'
      return Order.fromJSON({ column, order })
    }
  }

  get isAsc () { return this.order === 'ASC' && !this.isReversed }

  get isDesc () { return this.order === 'DESC' && !this.isReversed }

  toString () {
    return `${this.isReversed ? '-' : ''}${underscored(this.column)} ${this.order}`
  }
}

module.exports = Order
