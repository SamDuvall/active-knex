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
    _.extend(schema, {
      events: new Events(),

      before: function(event, callback) {
        this.events.on('before:' + event, callback);
      },

      after: function(event, callback) {
        this.events.on('after:' + event, callback);
      }
    });

    _.extend(schema, {
      query: function() {
        return query(knex, tableName, fields, joins, queries, options.onChange);
      },

      where: function() {
        var query = this.query();
        return query.where.apply(query, arguments);
      },

      create: function(data) {
        var createdAt = new Date();
        if (fields.createdAt && data.createdAt == undefined) data.createdAt = createdAt;
        if (fields.updatedAt && data.updatedAt == undefined) data.updatedAt = createdAt;

        return this.events.triggerBeforeAndAfter('create', data, function(data) {
          return schema.query().insert(data);
        });
      },

      update: function(data, changes) {
        var updatedAt = new Date();
        if (fields.updatedAt && changes.updatedAt == undefined) changes.updatedAt = updatedAt;

        return this.events.triggerBeforeAndAfter('update', changes, function(changes) {
          return schema.where({id: data.id}).update(changes).then(function() {
            return _.extend(data, changes);
          });
        });
      },

      findById: function(id) {
        return this.where({id: id}).first();
      },

      findOrCreate: function(data) {
        var params = this.keys ? _.pick(data, this.keys) : _.keys(data);
        params = util.underscored(params);

        return schema.where(params).first().then(function(row) {
          return row || schema.create(data);
        });
      },

      removeById: function(id) {
        return this.where({id: id}).delete();
      }
    });

    return schema;
  }
});
