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

  // Determine the ordering for this order
  function determineOrdering(order) {
    if (!schema.orders) return order;
    return schema.orders[order] || order;
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
  qb.orderBy = function(order) {
    // Base call
    if (arguments.length === 2) orderBy.apply(this, arguments);

    // Override
    var ordering = determineOrdering(order);
    var columns = util.arrayify(ordering);
    _.each(columns, function(column) {
      var order = util.parseColumn(column);
      return orderBy.call(this, order.column, order.desc ? 'desc' : 'asc');
    }, this);

    return this;
  };

  // Get the entries after the last value in the order provided
  // NOTE: This is for infinite scrolling
  qb.after = function(order, lastValue, lastId) {
    var idColumn = schema.tableName + '.id';
    var ordering = determineOrdering(order);
    var columns = util.arrayify(ordering);
    var lastValues = util.arrayify(lastValue)

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

  // Get the entries after the last id in the order provided
  // NOTE: This is for infinite scrolling
  qb.afterId = function(order, lastId) {
    // If no id, move along
    var qb = this;
    if (!lastId) return qb.orderBy(order);

    // Determine the columns we need to pull for the sort
    var idColumn = schema.tableName + '.id';
    var ordering = determineOrdering(order);
    var columns = util.arrayify(ordering);
    columns = _.chain(columns).map(util.parseColumn).pluck('column').value();

    // Create select columns
    var selects = _.map(columns, function(column, index) {
      return column + ' AS column_' + index;
    });

    // Search by id (clone current qb, remove other selects and where by id)
    return qb.defer(function() {
      var findQb = qb.clone();
      findQb._statements = _.reject(findQb._statements, function(statement) {
        return statement.grouping === 'columns';
      });
      findQb.where(idColumn, lastId);
      return findQb.first(selects).then(function(record) {
        var values = _.values(record);
        qb.after(order, values, lastId);
      });
    });
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
