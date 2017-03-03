var _ = require('underscore');
var Fields = require('../schema/fields');
var util = require('../util');

// Determine if this value is raw
function isRaw(value) {
  if (!value || !value.constructor) return false;
  return value.constructor.name === 'Raw';
}

// Get this attribute from the field
function getFieldAttr(field, attr) {
  // Attributes on the field directly?
  if (!field) return;
  if (field[attr]) return field[attr];

  // Does the field have a know type with the attribute?
  var known = Fields.known[field.type];
  if (known) return known[attr];
}

// Covert value from db
function fromDb(field, value) {
  var fromDb = getFieldAttr(field, 'fromDb');
  return fromDb ? fromDb(value) : value;
}

// Covert value to db
function toDb(field, value) {
  var toDb = getFieldAttr(field, 'toDb');
  return toDb ? toDb(value) : value;
}

// Extend the query builder
function extendQuery(qb, schema) {
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
      data[key] = isRaw(value) ? value : toDb(fields[key], value);
      return data;
    }, {});
  }

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  var insert = qb.insert;
  qb.insert = function(data, returning) {
    data = util.arrayify(data);
    data = _.map(data, mapToDb);
    return insert.call(qb, data, returning);
  };

  // Update a row in the table by converting the fields
  var update = qb.update;
  qb.update = function(data, returning) {
    var params = mapToDb(data);
    return update.call(qb, params, returning);
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
