const util = require('./lib/util')
module.exports = Object.assign({
  Relation: require('./lib/relation'),
  Schema: require('./lib/schema')
}, util)
