var _ = require('underscore');

// Map fields defined on a schema
function mapFields(fields) {
  fields = fields || {};

  // If time fields are "true", then configure them as dates
  if (fields.createdAt === true) fields.createdAt = {type: 'date'};
  if (fields.updatedAt === true) fields.updatedAt = {type: 'date'};

  // Add parameters to known fields
  _.each(fields, function(field, key) {
    var params = known[field.type];
    _.extend(field, params);
  });

  return fields;
}

// Known fields
var known = {
  boolean: {
    fromDb: function(value) {
      return value == true;
    },

    toDb: function(value) {
      return value;
    }
  },

  csv: {
    fromDb: function(value) {
      if (value == undefined) return null;
      if (!value.length) return [];
      return value.split(',');
    },

    toDb: function(value) {
      if (value == undefined) return null;
      return value.join(',');
    }
  },

  csvInteger: {
    fromDb: function(value) {
      if (value == undefined) return null;
      if (!value.length) return [];
      var values = value.split(',');
      return _.map(values, function(value) {
        return parseInt(value, 10);
      });
    },

    toDb: function(value) {
      if (value == undefined) return null;
      return value.join(',');
    }
  },

  date: {
    fromDb: function(value) {
      return value;
    },

    toDb: function(value) {
      return value;
    }
  },

  json: {
    fromDb: function(value) {
      return JSON.parse(value);
    },

    toDb: function(value) {
      return JSON.stringify(value);
    }
  }
};

module.exports = {
  known: known,
  map: mapFields
}
