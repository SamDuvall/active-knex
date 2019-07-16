const isArray = require('lodash/isArray')
const { Factory } = require('rosie')
const Player = require('./examples/player')
const Team = require('./examples/team')
require('./database')

Factory.define = function (name, schema) {
  var factory = new Factory()
  factory.schema = schema
  this.factories[name] = factory
  return factory
}

Factory.create = async function (name, params) {
  const build = (attr) => this.build(name, attr)
  const attr = isArray(params) ? params.map(build) : build(params)
  const factory = this.factories[name]
  return factory.schema.create(attr)
}

Factory.define('player', Player)
  .sequence('name', (i) => 'Player #' + i)

Factory.define('team', Team)
  .sequence('name', (i) => 'Team #' + i)

Factory.define('team.bus', Team.Bus)
  .sequence('driver', (i) => 'Bus Driver #' + i)

module.exports = Factory
