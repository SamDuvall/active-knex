var _ = require('underscore');
var Raw = require('knex/lib/raw');
var Fields = require('../schema/fields');
var util = require('../util');

// Covert value from db
function fromDb(field, value) {
  if (!field) return value;
  if (!field.fromDb) field.fromDb = Fields.known[field.type].fromDb;
  return field.fromDb(value);
}

// Covert value to db
function toDb(field, value) {
  if (!field || value == undefined) return value;
  if (!field.toDb) field.toDb = Fields.known[field.type].toDb;
  return field.toDb(value);
}

// Extend the query builder
function extendQuery(qb, schema) {
  var events = schema._events;
  var fields = schema.fields;

  // Convert fields coming back from the DB
  function mapFromDb(data) {
    if (_.isArray(data)) return _.map(data, mapFromDb);

    return _.reduce(data, function(data, value, key) {
      data[key] = fromDb(fields[key], value);
      return data;
    }, {});
  }

  // Convert fields going down to the DB
  function mapToDb(data) {
    return _.reduce(data, function(data, value, key) {
      var isRaw = value instanceof Raw;
      data[key] = isRaw ? value : toDb(fields[key], value);
      return data;
    }, {});
  }

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  var insert = qb.insert;
  qb.insert = function(data, returning) {
    return events.triggerBeforeAndAfter('save', data, qb.transacting, function(data) {
      data = util.arrayify(data);
      data = _.map(data, mapToDb);
      return insert.call(qb, data, returning);
    });
  };

  // Update a row in the table by converting the fields
  var update = qb.update;
  qb.update = function(data, returning) {
    return events.triggerBeforeAndAfter('save', data, qb.transacting, function(data) {
      var params = mapToDb(data);
      return update.call(qb, params, returning);
    });
  };

  // Override then to format the result
  var then = qb.then;
  qb.then = function(onFulfilled, onRejected) {
    return then.call(qb, function(result) {
      var method = qb._method || 'select';
      var isSelect = _.include(['select', 'first'], method);
      if (isSelect && result) result = mapFromDb(result);
      return onFulfilled(result);
    }, onRejected);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
