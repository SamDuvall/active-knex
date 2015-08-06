var _ = require('underscore');
var Promise = require('bluebird');
var Events = require('./events');
var query = require('./query');
var util = require('./util');

var allJoins = {};
module.exports = _.extend({}, util, {
  Relation: require('./relation'),

  create: function(knex, options) {
    // Create schema
    var schema = _.pick(options, 'tableName', 'primaryKey', 'keys');
    var tableName = schema.tableName;
    var primaryKey = schema.primaryKey || 'id';

    // Initialize
    var fields = schema.fields = options.fields || {};
    var joins = schema.joins = options.joins || {};
    var queries = schema.queries = options.queries || {};
    var relations = schema.relations = options.relations || {};

    // Condition Fields
    if (fields.createdAt === true) fields.createdAt = {type: 'date'};
    if (fields.updatedAt === true) fields.updatedAt = {type: 'date'};

    // Save joins
    allJoins[tableName] = options.joins;

    // Create basic model interface
    var events = new Events();
    _.extend(schema, {
      before: function(event, callback) {
        events.on('before:' + event, callback);
      },

      after: function(event, callback) {
        events.on('after:' + event, callback);
      }
    });

    _.extend(schema, {
      query: function() {
        return query(knex, tableName, fields, allJoins, queries, events);
      },

      where: function() {
        var query = this.query();
        return query.where.apply(query, arguments);
      },

      create: function(data) {
        // Ensure each entry has create/update times
        var entries = util.arrayify(data);
        _.each(entries, function(entry) {
          var createdAt = new Date();
          if (fields.createdAt && entry.createdAt == undefined) entry.createdAt = createdAt;
          if (fields.updatedAt && entry.updatedAt == undefined) entry.updatedAt = createdAt;
        });

        return events.triggerBeforeAndAfter('create', data, function(data) {
          return schema.query().insert(data);
        });
      },

      update: function(data, changes) {
        var updatedAt = new Date();
        if (fields.updatedAt && changes.updatedAt == undefined) changes.updatedAt = updatedAt;

        return events.triggerBeforeAndAfter('update', changes, function(changes) {
          var where = {};
          where[primaryKey] = data[primaryKey];
          return schema.where(where).update(changes).then(function() {
            return _.extend(data, changes);
          });
        });
      },

      findById: function(id) {
        var where = {};
        where[primaryKey] = id;
        return this.where(where).first();
      },

      findOrCreate: function(data) {
        var search = this.keys ? _.pick(data, this.keys) : _.keys(data);
        search = util.underscored(search);

        return schema.where(search).first().then(function(row) {
          return row || schema.create(data);
        });
      },

      updateOrCreate: function(data) {
        var search = this.keys ? _.pick(data, this.keys) : _.keys(data);
        var values = _.omit(data, this.keys);
        search = util.underscored(search);

        return schema.where(search).first().then(function(row) {
          return row ? schema.update(row, values) : schema.create(data);
        });
      },

      removeById: function(id) {
        var where = {};
        where[primaryKey] = id;
        return this.where(where).delete();
      },

      load: function(data) {
        var names = _.rest(arguments);
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

    return schema;
  }
});
