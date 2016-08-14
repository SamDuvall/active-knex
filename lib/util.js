var _ = require('underscore');

module.exports = {
  // Turn whatever this value is into an array
  arrayify: function(value) {
    if (value === undefined) return [];
    else if (_.isArray(value)) return value;
    else return [value];
  },

  // Parse this column for ordering
  parseColumn: function(column) {
    var desc = column[0] === '-';
    return {
      column: desc ? column.substr(1) : column,
      desc: desc
    }
  }
};
