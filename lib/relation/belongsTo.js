var _ = require('underscore');
var _str = require('underscore.string');

function BelongsTo(options) {
  _.extend(this, options);
}

_.extend(BelongsTo.prototype, {
  query: function(ids, trx) {
    return this.model.transacting(trx).whereIn('id', ids);
  },

  load: function(rows, name, trx) {
    var key = this.key ? _str.camelize(this.key) : 'id';
    var foreignKey = _str.camelize(this.foreignKey);
    var ids = _.pluck(rows, foreignKey);
    return this.query(ids, trx).then(function(results) {
      _.each(rows, function(row) {
        row[name] = _.find(results, function(result) {
          return result[key] == row[foreignKey];
        });
      });
    });
  }
});

module.exports = function(options) {
  return new BelongsTo(options);
};
