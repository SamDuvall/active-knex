var _ = require('underscore');
var _str = require('underscore.string');

function HasMany(options) {
  _.extend(this, options);
}

_.extend(HasMany.prototype, {
  query: function(ids) {
    return this.model.query().whereIn(this.foreignKey, ids);
  },

  load: function(rows, name) {
    var key = this.key ? _str.camelize(this.key) : 'id';
    var foreignKey = _str.camelize(this.foreignKey);
    var ids = _.pluck(rows, key);
    return this.query(ids).then(function(results) {
      _.each(rows, function(row) {
        row[name] = _.filter(results, function(result) {
          return result[foreignKey] == row[key];
        });
      });
    });
  }
});

module.exports = function(options) {
  return new HasMany(options);
};
