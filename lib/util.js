var _ = require('underscore');

module.exports = {
  arrayify: function(value) {
    if (value == undefined) return [];
    else if (_.isArray(value)) return value;
    else return [value];
  }
};
