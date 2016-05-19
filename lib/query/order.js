var _ = require('underscore');
var util = require('../util');

// Extend the query builder
function extendQuery(qb, schema) {

  // Format the value for the compar
  function formatValue(value) {
    if (_.isDate(value)) return value.toISOString();
    return _.isNumber(value) ? value : '"' + value + '"';
  }

  // Template for the after where
  var afterWhereTpl = _.template('(<%= column %> <%= sign %> <%= value %> OR (<%= column %> = <%= value %> AND <%= idColumn %> <%= sign %> <%= id %>))');

  // Override the orderBy to prepend a '-' to switch to DESC
  var orderBy = qb.orderBy;
  qb.orderBy = function(column, direction) {
    var order = util.parseColumn(column);
    return orderBy.call(this, order.column, order.desc ? 'desc' : direction);
  };

  // Get the entries after the last value in the order provided
  // NOTE: This is for infinite scrolling
  qb.after = function(column, lastValue, lastId) {
    var idColumn = schema.tableName + '.id';
    var order = util.parseColumn(column);

    // If we have a last starting point
    if (lastValue !== undefined && lastId !== undefined) {
      var where = afterWhereTpl({
        column: order.column,
        id: lastId,
        idColumn: idColumn,
        sign: order.desc ? '<' : '>',
        value: formatValue(lastValue)
      })
      this.whereRaw(where);
    }

    // Set the ordering
    var direction = order.desc ? 'desc' : 'asc';
    return this.orderBy(order.column, direction).orderBy(idColumn, direction);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
