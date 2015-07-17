// Get the entries after the last value in the order provided
module.exports = function(column, id) {
  if (!id) return this.orderBy(column);

  column = column || 'id';
  var desc = (column[0] == '-');
  var field = desc ? column.substr(1) : column;
  var sign = desc ? '<' : '>';

  var tableName = this._single.table;
  var sub = ['(SELECT', field, 'FROM', tableName, 'WHERE id=?)'].join(' ');
  var where = [field, sign, sub].join(' ');
  return this.whereRaw(where, [id]).orderBy(column);
}
