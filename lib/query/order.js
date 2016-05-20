var _ = require('underscore');
var util = require('../util');

// Extend the query builder
function extendQuery(qb, schema) {
  // Quote a value for sql
  function quoteValue(value) {
    return '"' + value + '"';
  }

  // Format the value for the compar
  function formatValue(value) {
    if (_.isNull(value)) return value;
    if (_.isNumber(value)) return value;
    if (_.isDate(value)) value = value.toISOString();
    return quoteValue(value)
  }

  // Template for the after where
  var afterWheres = [{
    desc: false,
    null: false,
    tpl: _.template('(<%= column %> <%= sign %> <%= value %> OR (<%= column %> = <%= value %> AND <%= idColumn %> <%= sign %> <%= id %>))')
  }, {
    desc: false,
    null: true,
    tpl: _.template('(<%= column %> IS NOT NULL OR (<%= column %> IS NULL AND <%= idColumn %> <%= sign %> <%= id %>))')
  }, {
    desc: true,
    null: false,
    tpl: _.template('(<%= column %> <%= sign %> <%= value %> OR <%= column %> IS NULL OR (<%= column %> = <%= value %> AND <%= idColumn %> <%= sign %> <%= id %>))')
  }, {
    desc: true,
    null: true,
    tpl: _.template('(<%= column %> IS NULL AND <%= idColumn %> <%= sign %> <%= id %>)')
  }]

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
      var value = formatValue(lastValue);
      var afterWhere = _.findWhere(afterWheres, {desc: order.desc, null: _.isNull(value)});
      var where = afterWhere.tpl({
        column: order.column,
        id: lastId,
        idColumn: idColumn,
        sign: order.desc ? '<' : '>',
        value: value
      });
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
