/* global after before beforeEach */
const flatMap = require('lodash/flatMap')
const values = require('lodash/values')
const Promise = require('bluebird')
const knex = require('./knex')

// Tables
let tablesCache
const getTables = () => knex.transaction(trx => {
  return trx.raw('SHOW TABLES').spread(rows => flatMap(rows, row => values(row)[0]))
})
const truncateTables = (tables) => knex.transaction(trx => {
  return Promise.map(tables, (table) => knex(table).transacting(trx).truncate())
})

// Operations
const loadSchema = () => knex.schemaLoader.reset()
const cleanDatabase = () => truncateTables(tablesCache)

// Create the database
before(async function () {
  this.timeout(5000)
  await loadSchema()
  tablesCache = await getTables()
})

const isClean = (ctx) => ctx.title.includes('@cleandb')
const hasClean = (ctx) => {
  const {parent} = ctx
  return isClean(ctx) || (parent && hasClean(parent))
}

beforeEach(function () {
  const clean = hasClean(this.currentTest)
  if (clean) return cleanDatabase()
})

// All done, disconnect
after(() => knex.destroy())

module.exports = {cleanDatabase}
