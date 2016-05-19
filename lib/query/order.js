var _ = require('underscore');

// Extend the query builder
function extendQuery(qb, schema) {
  // Determine if reverse
  function isReverse(column) {
    return column[0] === '-';
  }

  // Format the column
  function formatColumn(column) {
    var reverse = isReverse(column);
    return reverse ? column.substr(1) : column;
  }

  // Format the value for the compar
  function formatValue(value) {
    return _.isNumber(value) ? value : '"' + value + '"';
  }

  // Template for the after where
  var afterWhereTpl = _.template('(<%= column %> <%= sign %> <%= value %> OR (<%= column %> = <%= value %> AND <%= idColumn %> <%= sign %> <%= id %>))');

  // Override the orderBy to prepend a '-' to switch to DESC
  var orderBy = qb.orderBy;
  qb.orderBy = function(column, direction) {
    var reverse = isReverse(column);
    column = formatColumn(column);
    return orderBy.call(this, column, reverse ? 'desc' : direction);
  };

  // Get the entries after the last value in the order provided
  // NOTE: This is for infinite scrolling
  qb.after = function(column, lastValue, lastId) {
    var idColumn = schema.tableName + '.id';
    var reverse = isReverse(column);
    column = formatColumn(column);

    // If we have a last starting point
    if (lastValue !== undefined && lastId !== undefined) {
      var where = afterWhereTpl({
        column: column,
        idColumn: idColumn,
        sign: reverse ? '<' : '>',
        value: formatValue(lastValue),
        id: lastId
      })
      this.whereRaw(where);
    }

    // Set the ordering
    var direction = reverse ? 'desc' : 'asc';
    return this.orderBy(column, direction).orderBy(idColumn, direction);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
