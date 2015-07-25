var _ = require('underscore');
var Events = require('./events');
var query = require('./query');
var relations = require('./relations');
var util = require('./util');

var joins = {};
module.exports = _.extend({}, util, {
  Relation: require('./relation'),

  create: function(knex, options) {
    var schema = _.pick(options, 'tableName', 'keys');
    if (options.relations) _.extend(schema, relations(options.relations));

    // Condition Fields
    var fields = options.fields || {};
    if (fields.createdAt === true) fields.createdAt = {type: 'date'};
    if (fields.updatedAt === true) fields.updatedAt = {type: 'date'};

    // Save joins
    var tableName = options.tableName;
    var queries = options.queries;
    if (options.joins) joins[tableName] = options.joins;

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
        return query(knex, tableName, fields, joins, queries, events);
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
          return schema.where({id: data.id}).update(changes).then(function() {
            return _.extend(data, changes);
          });
        });
      },

      findById: function(id) {
        return this.where({id: id}).first();
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
        return this.where({id: id}).delete();
      }
    });

    return schema;
  }
});
