var _ = require('underscore');

// KNOWN FIELDS ===============================================================

var knownFields = {
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

// Map fields defined on a schema
function mapSchema(fields) {
  fields = fields || {};

  // If time fields are "true", then configure them as dates
  if (fields.createdAt === true) fields.createdAt = {type: 'date'};
  if (fields.updatedAt === true) fields.updatedAt = {type: 'date'};

  return fields;
}

// FIELD OPERATIONS ===========================================================

// Determine if this value is raw
function isRaw(value) {
  if (!value || !value.constructor) return false;
  return value.constructor.name === 'Raw';
}

// Get this attribute from the field
function getFieldAttr(field, attr) {
  // Attributes on the field directly?
  if (!field) return;
  if (field[attr]) return field[attr];

  // Does the field have a know type with the attribute?
  var known = knownFields[field.type];
  if (known) return known[attr];
}

// Covert value from db
function mapFieldFromDb(field, value) {
  var fromDb = getFieldAttr(field, 'fromDb');
  return fromDb ? fromDb(value) : value;
}

// Covert value to db
function mapFieldToDb(field, value) {
  var toDb = getFieldAttr(field, 'toDb');
  return toDb && !isRaw(value) ? toDb(value) : value;
}

// Convert fields coming back from the DB
function mapFieldsFromDb(fields, data) {
  if (_.isArray(data)) return _.map(data, function(row) {
    return mapFieldsFromDb(fields, row);
  });

  return _.reduce(data, function(data, value, key) {
    data[key] = mapFieldFromDb(fields[key], value);
    return data;
  }, {});
}

// Convert fields going down to the DB
function mapFieldsToDb(fields, data) {
  if (_.isArray(data)) return _.map(data, function(row) {
    return mapFieldsToDb(fields, row);
  });

  return _.reduce(data, function(data, value, key) {
    data[key] = mapFieldToDb(fields[key], value);
    return data;
  }, {});
}

module.exports = {
  known: knownFields,
  mapSchema: mapSchema,

  mapFieldFromDb: mapFieldFromDb,
  mapFieldToDb: mapFieldToDb,
  mapFieldsFromDb: mapFieldsFromDb,
  mapFieldsToDb: mapFieldsToDb
}
