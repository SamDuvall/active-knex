var _ = require('underscore');
var _str = require('underscore.string');

module.exports = {
  arrayify: function(value) {
    if (value == undefined) return [];
    else if (_.isArray(value)) return value;
    else return [value];
  },

  camelize: function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
      memo[_str.camelize(key)] = val;
      return memo;
    }, {});
  },

  underscored: function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
      memo[_str.underscored(key)] = val;
      return memo;
    }, {});
  },

  formatDate: function(date) {
    return date.format('YYYY-MM-DD HH:mm:ss');
  },

  fromDb: {
    boolean: function(value) {
      return value == true;
    },

    date: function(value) {
      return value;
    },

    json: function(value) {
      return JSON.parse(value);
    }
  },

  toDb: {
    date: function(value) {
      return value;
    },

    json: function(value) {
      return JSON.stringify(value);
    }
  }
};
