var Promise = require('bluebird');
var _ = require('underscore');

function toPrimary(names) {
  return _.chain(names).map(function(name) {
    return _.first(name.split('.'));
  }).uniq().value();
}

function isPrimary(name) {
  return name.split('.').length == 1;
}

module.exports = function(relations) {
  return {
    load: function(data) {
      var names = _.rest(arguments);
      var primary = toPrimary(names);
      var secondary = _.reject(names, isPrimary);

      var rows = _.isArray(data) ? data : [data];
      return Promise.each(primary, function(name) {
        var relation = relations[name]();
        return relation.load(rows, name);
      }).then(function() {
        return Promise.each(secondary, function(name) {
          var names = name.split('.');
          var through = _.first(names);
          var name = _.rest(names).join('.');

          var relation = relations[through]();
          var subRows = _.pluck(rows, through);
          return relation.model.load(subRows, name);
        });
      }).then(function() {
        return data;
      })
    }
  }
}
