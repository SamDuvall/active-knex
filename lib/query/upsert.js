var _ = require('underscore');
var util = require('../util');

// Extend the query builder
function extendQuery(qb, schema) {
  var events = schema._events;
  var fields = schema.fields;

  // Convert fields coming back from the DB
  function fromDb(data) {
    if (_.isArray(data)) return _.map(data, fromDb);

    return _.reduce(data, function(data, value, key) {
      var field = fields[key];
      if (field && field.fromDb) value = field.fromDb(value);
      data[key] = value;
      return data;
    }, {});
  }

  // Convert fields going down to the DB
  function toDb(data) {
    return _.reduce(data, function(data, value, key) {
      var field = fields[key];
      if (field && field.toDb && value != undefined) value = field.toDb(value);
      data[key] = value;
      return data;
    }, {});
  }

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  var insert = qb.insert;
  qb.insert = function(data, returning) {
    return events.triggerBeforeAndAfter('save', data, function(data) {
      data = util.arrayify(data);
      data = _.map(data, toDb);
      return insert.call(qb, data, returning);
    });
  };

  // Update a row in the table by converting the fields
  var update = qb.update;
  qb.update = function(data, returning) {
    return events.triggerBeforeAndAfter('save', data, function(data) {
      var params = toDb(data);
      return update.call(qb, params, returning);
    });
  };

  // Override then to format the result
  var then = qb.then;
  qb.then = function(onFulfilled, onRejected) {
    return then.call(qb, function(result) {
      var method = qb._method || 'select';
      var isSelect = _.include(['select', 'first'], method);
      if (isSelect && result) result = fromDb(result);
      return onFulfilled(result);
    }, onRejected);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
