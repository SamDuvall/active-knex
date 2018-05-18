const util = require('./src/util')
module.exports = Object.assign({
  Relation: require('./src/relation'),
  Schema: require('./src/schema')
}, util)
