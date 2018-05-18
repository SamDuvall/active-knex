const knex = require('knex')
const config = require('../knexfile').test
const { postProcessResponse, wrapIdentifier } = require('..')
module.exports = knex({
  ...config,
  postProcessResponse,
  wrapIdentifier
})
