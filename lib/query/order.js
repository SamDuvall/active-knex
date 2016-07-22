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
    tpl: _.template('(<%= column %> <%= sign %> <%= value %> OR (<%= column %> = <%= value %> AND <%= where %>))')
  }, {
    desc: false,
    null: true,
    tpl: _.template('(<%= column %> IS NOT NULL OR (<%= column %> IS NULL AND <%= where %>))')
  }, {
    desc: true,
    null: false,
    tpl: _.template('(<%= column %> <%= sign %> <%= value %> OR <%= column %> IS NULL OR (<%= column %> = <%= value %> AND <%= where %>))')
  }, {
    desc: true,
    null: true,
    tpl: _.template('(<%= column %> IS NULL AND <%= where %>)')
  }];

  // Format the next where clause for an after statement
  function formatAfterWhere(order, lastValue, where) {
    // Pull the value, if undefined, don't touch the where
    if (lastValue === undefined) return where;
    var value = formatValue(lastValue);
    var isNull = _.isNull(value);

    // Run the template
    var template = _.findWhere(afterWheres, {desc: order.desc, null: isNull}).tpl;
    return template({
      column: order.column,
      sign: order.desc ? '<' : '>',
      value: value,
      where: where
    });
  }

  // Override the orderBy to prepend a '-' to switch to DESC
  var orderBy = qb.orderBy;
  qb.orderBy = function(column, direction) {
    // Base call
    if (arguments.length === 2) orderBy.apply(this, arguments);

    // Override
    var columns = util.arrayify(column);
    _.each(columns, function(column) {
      var order = util.parseColumn(column);
      return orderBy.call(this, order.column, order.desc ? 'desc' : 'asc');
    }, this);

    return this;
  };

  // Get the entries after the last value in the order provided
  // NOTE: This is for infinite scrolling
  qb.after = function(column, lastValue, lastId) {
    var idColumn = schema.tableName + '.id';
    var columns = _.isArray(column) ? column : [column];
    var lastValues = _.isArray(lastValue) ? lastValue : [lastValue];

    // Do column comparison
    if (lastId !== undefined && lastValue !== undefined) {
      var where = idColumn + ' > ' + lastId;

      // Add column wheres (in reverse)
      var indexes = _.range(0, columns.length).reverse();
      _.each(indexes, function(index) {
        var column = columns[index];
        var lastValue = lastValues[index];
        var order = util.parseColumn(column);
        where = formatAfterWhere(order, lastValue, where);
      });

      this.whereRaw(where);
    }

    // Do column ordering (in order)
    _.each(columns, function(column) {
      var order = util.parseColumn(column);
      this.orderBy(order.column, order.desc ? 'desc' : 'asc');
    }, this);

    // Set the ordering
    return this.orderBy(idColumn);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
