var _ = require('underscore');
var Promise = require('bluebird');
var Events = require('./schema/events');
var Fields = require('./schema/fields');
var Query = require('./query');
var util = require('./util');

// User defined schema
function Schema(tableName) {
  this.tableName = tableName;
  this._events = new Events();
}

// Define the prototype for the schema
_.extend(Schema.prototype, {
  // SHORTCUTS ----------------------------------------------------------------

  // Create a where shortcut that creates a query and starts with here
  where: function() {
    var query = this.query();
    return query.where.apply(query, arguments);
  },

  // BY ID --------------------------------------------------------------------

  // Find a row by the primaryKey field
  findById: function(id) {
    var where = {};
    where[this.primaryKey] = id;
    return this.where(where).first();
  },

  // Remove a remove by the primaryKey field
  removeById: function(id) {
    var where = {};
    where[this.primaryKey] = id;
    return this.where(where).delete();
  },

  // UPDATE / CREATE

  // Create single OR multiple rows of data
  create: function(data) {
    var schema = this;
    var events = this._events;
    var fields = this.fields;

    // If no entries, then do nothing
    var entries = util.arrayify(data);
    if (entries.length === 0) return Promise.resolve(entries);

    // Ensure each entry has create/update times
    _.each(entries, function(entry) {
      var createdAt = new Date();
      if (fields.createdAt && entry.createdAt == undefined) entry.createdAt = createdAt;
      if (fields.updatedAt && entry.updatedAt == undefined) entry.updatedAt = createdAt;
    });

    return events.triggerBeforeAndAfter('create', data, function(data) {
      return schema.query().insert(data).then(function(result) { // Query the rows back
        var id = _.first(result);
        if (result.length > 1) { // PostgreSQL gives back all the ids
          return schema.query().whereIn(schema.primaryKey, result);
        } else if (id === 0) { // No id? Return most recent rows
          return schema.query().orderBy(schema.primaryKey, 'desc').limit(entries.length);
        } else { // Know the ID, start there
          ids = _.range(id, id + entries.length);
          return schema.query().whereIn(schema.primaryKey, ids);
        }
      }).then(function(rows) { // Return object or array
        return _.isArray(data) ? rows : _.first(rows);
      });
    });
  },

  // Update this data (must have id)
  update: function(data, changes) {
    var schema = this;
    var events = this._events;
    var fields = this.fields;

    var updatedAt = new Date();
    if (fields.updatedAt && changes.updatedAt == undefined) changes.updatedAt = updatedAt;

    return events.triggerBeforeAndAfter('update', changes, function(changes) {
      var where = {};
      where[schema.primaryKey] = data[schema.primaryKey];
      return schema.where(where).update(changes).then(function() {
        return _.extend(data, changes);
      });
    });
  },

  // Find the row that matches these params, or create it
  // Only find using keys
  findOrCreate: function(data) {
    var schema = this;
    var search = this.keys ? _.pick(data, this.keys) : _.keys(data);
    return schema.where(search).first().then(function(row) {
      return row || schema.create(data);
    });
  },

  // Update the row that matches these params, or create it
  // Only find using keys
  updateOrCreate: function(data) {
    var schema = this;
    var search = this.keys ? _.pick(data, this.keys) : _.keys(data);
    var values = _.omit(data, this.keys);
    return schema.where(search).first().then(function(row) {
      return row ? schema.update(row, values) : schema.create(data);
    });
  },

  // EVENTS -------------------------------------------------------------------

  before: function(event, callback) {
    this._events.on('before:' + event, callback);
  },

  after: function(event, callback) {
    this._events.on('after:' + event, callback);
  },

  // RELATIONS ----------------------------------------------------------------

  // Load the given relations onto the data
  // data - object OR array to load relations ONTO
  // (remaining parameters) - list of relations to load
  load: function(data) {
    var names = _.rest(arguments);
    var relations = this.relations;
    var rows = util.arrayify(data);

    var primary = _.chain(names).map(function(name) {
      return _.first(name.split('.'));
    }).uniq().value();

    return Promise.each(primary, function(name) {
      var relation = relations[name]();
      return relation.load(rows, name);
    }).then(function() {
      var secondary = _.reject(names, function(name) {
        return name.split('.').length == 1;
      });

      return Promise.each(secondary, function(name) {
        var names = name.split('.');
        var through = _.first(names);
        var name = _.rest(names).join('.');

        var relation = relations[through]();
        var subRows = _.chain(rows).pluck(through).flatten().value();
        return relation.model.load(subRows, name);
      });
    }).then(function() {
      return data;
    })
  }
});

// Allow user to define custom fields
Schema.fields = Fields.known;

// All the joins we know about (global registry)
Schema.joins = {};

// Create a new schema
Schema.create = function(knex, options) {
  // Create schema
  var schema = new Schema(options.tableName);
  schema.primaryKey = options.primaryKey || 'id';
  schema.keys = options.keys || [];
  schema.fields = Fields.map(options.fields);
  schema.joins = options.joins || {};
  schema.queries = options.queries || {};
  schema.relations = options.relations || {};
  schema.query = _.partial(Query.generate, knex, schema);

  // Save joins
  Schema.joins[schema.tableName] = schema.joins;

  return schema;
};

module.exports = Schema;
