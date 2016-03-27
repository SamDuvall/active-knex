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
