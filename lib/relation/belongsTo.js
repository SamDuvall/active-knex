var _ = require('underscore');
var _str = require('underscore.string');

function BelongsTo(options) {
  _.extend(this, options);
}

_.extend(BelongsTo.prototype, {
  query: function(ids) {
    return this.model.query().whereIn('id', ids);
  },

  load: function(rows, name) {
    var key = this.key ? _str.camelize(this.key) : 'id';
    var foreignKey = _str.camelize(this.foreignKey);
    var ids = _.pluck(rows, foreignKey);
    return this.query(ids).then(function(results) {
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
