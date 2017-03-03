var _ = require('underscore');
var Fields = require('../schema/fields');
var util = require('../util');

// Extend the query builder
function extendQuery(qb, schema) {
  var fields = schema.fields;
  var mapFieldsFromDb = _.partial(Fields.mapFieldsFromDb, schema.fields);
  var mapFieldsToDb = _.partial(Fields.mapFieldsToDb, schema.fields);

  // Insert a row into the table, by converting the fields and then
  // returning the created rows
  var insert = qb.insert;
  qb.insert = function(data, returning) {
    data = util.arrayify(data);
    data = _.map(data, mapFieldsToDb);
    return insert.call(qb, data, returning);
  };

  // Update a row in the table by converting the fields
  var update = qb.update;
  qb.update = function(values) {
    if (_.isString(values)) { // qb.update(field, value, returning)
      var field = schema.fields[values];
      var value = Fields.mapFieldToDb(field, arguments[1]);
      return update.call(qb, values, value, arguments[2]);
    } else { // qb.update(values, returning)
      values = mapFieldsToDb(values);
      return update.call(qb, values, arguments[1]);
    }
  };

  // Override then to format the result
  var then = qb.then;
  qb.then = function(onFulfilled, onRejected) {
    return then.call(qb, function(result) {
      var method = qb._method || 'select';
      var isSelect = _.include(['select', 'first'], method);
      if (isSelect && result) result = mapFieldsFromDb(result);
      return onFulfilled(result);
    }, onRejected);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
