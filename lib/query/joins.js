var _ = require('underscore');

// Extend the query builder
function extendQuery(qb, schema) {
  var joins = require('../schema').joins;

  function isJoined(qb, from, to) {
    return !!_.findWhere(qb.joined, {from: from, to: to});
  }

  function addJoined(qb, from, to) {
    qb.joined = qb.joined || [];
    qb.joined.push({from: from, to: to});
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
