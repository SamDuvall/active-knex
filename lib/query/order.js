// Extend the query builder
function extendQuery(qb) {
  // Override the orderBy to prepend a - to switch to DESC
  var orderBy = qb.orderBy;
  qb.orderBy = function(column) {
    var desc = column[0] === '-';
    if (desc) column = column.substr(1);
    return orderBy.call(this, column, desc ? 'desc' : 'asc');
  };

  // Get the entries after the last value in the order provided
  qb.after = function(column, id) {
    if (!id) return this.orderBy(column);

    column = column || 'id';
    var desc = (column[0] == '-');
    var field = desc ? column.substr(1) : column;
    var sign = desc ? '<' : '>';

    var tableName = this._single.table;
    var sub = ['(SELECT', field, 'FROM', tableName, 'WHERE id=?)'].join(' ');
    var where = [field, sign, sub].join(' ');
    return this.whereRaw(where, [id]).orderBy(column);
  };

  return qb;
};

module.exports = {
  extendQuery: extendQuery
};
