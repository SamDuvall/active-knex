var _ = require('underscore');
var Promise = require('bluebird');
var knex = require('./knex');

// Create the database
var tables;
before(function() {
  return knex.schemaLoader.reset().then(function() {
    return knex.raw('SHOW TABLES');
  }).then(function(result) {
    tables = _.chain(result).first().map(function(entry) {
      return _.values(entry);
    }).flatten().value();
  });
});

// For each step, clear the database
beforeEach(function() {
  return Promise.map(tables, function(table) {
    return knex(table).truncate();
  }).return(null);
});
