var _ = require('underscore');

// Extend the query builder
function extendQuery(qb, schema) {
  var joins = require('../schema').joins;

  function joinName(from, to) {
    return [from, to].join('.');
  }

  function isJoined(qb, from, to) {
    if (!qb.joined) return false;
    var name = joinName(from, to);
    return _.contains(qb.joined, name);
  }

  function addJoined(qb, from, to) {
    var name = joinName(from, to);
    qb.joined = _.union(qb.joined || [], [name]);
  }

  // Joins each table defined in the arguments
  qb.joins = function() {
    var qb = this;
    _.each(arguments, function(name) {
      // Go through the dots
      var from = schema.tableName;
      _.each(name.split('.'), function(to) {
        if (!isJoined(qb, from, to)) {
          var joinsFrom = joins[from];
          if (joinsFrom) var join = joinsFrom[to];
          if (!join) throw ['No join from', from, 'to', to].join(' ');

          join(qb);
          addJoined(qb, from, to);
        }

        from = to;
      });

    });

    return qb;
  };

  return qb;
}

module.exports = {
  extendQuery: extendQuery
};
