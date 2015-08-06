require('./database');
var _ = require('underscore');
var Factory = require('rosie').Factory;
var Player = require('./examples/player');
var Team = require('./examples/team');

// Override define
Factory.define = function(name, schema) {
  var factory = new Factory;
  factory.schema = schema;
  this.factories[name] = factory;
  return factory;
};

// Blocking create function
Factory.create = function(name, attributes, options) {
  var data = this.build.apply(this, arguments);
  var factory = this.factories[name];
  return waitFor(factory.schema.create(data));
}

Factory.define('player', Player)
  .sequence('name', function(i) { return 'Player #' + i})

Factory.define('team', Team)
  .sequence('name', function(i) { return 'Team #' + i})

Factory.define('team.bus', Team.Bus)
  .sequence('driver', function(i) { return 'Bus Driver #' + i})

module.exports = Factory;
