const isArray = require('lodash/isArray')
const reduce = require('lodash/reduce')

const FIELD_TYPES = {
  boolean: {
    fromDb: (value) => !!value,
    toDb: (value) => value
  },

  csv: {
    fromDb: function (value) {
      if (value === null) return null
      if (!value.length) return []
      return value.split(',')
    },

    toDb: function (value) {
      if (value === null) return null
      if (isArray(value)) value = value.join(',')
      return value
    }
  },

  csvInteger: {
    fromDb: function (value) {
      if (value === null) return null
      if (!value.length) return []
      return value.split(',').map((value) => parseInt(value, 10))
    },

    toDb: function (value) {
      if (value === null) return null
      if (isArray(value)) value = value.join(',')
      return value
    }
  },

  date: {
    fromDb: (value) => value,
    toDb: (value) => value
  },

  json: {
    fromDb: (value) => JSON.parse(value),
    toDb: (value) => JSON.stringify(value)
  }
}

// Map fields defined on a schema
const mapSchemaFields = (fields = {}) => {
  // If time fields are "true", then configure them as dates
  if (fields.createdAt === true) fields.createdAt = {type: 'date'}
  if (fields.updatedAt === true) fields.updatedAt = {type: 'date'}
  return fields
}

// FIELD OPERATIONS ===========================================================

// Determine if this value is raw
const isRaw = (value) => {
  if (!value || !value.constructor) return false
  return value.constructor.name === 'Raw'
}

// Get this attribute from the field
const getFieldAttr = (field, attr) => {
  // Attributes on the field directly?
  if (!field) return
  if (field[attr]) return field[attr]

  // Does the field have a know type with the attribute?
  const known = FIELD_TYPES[field.type]
  if (known) return known[attr]
}

// Covert value from db
const mapFieldFromDb = (field, value) => {
  const fromDb = getFieldAttr(field, 'fromDb')
  return fromDb ? fromDb(value) : value
}

// Covert value to db
const mapFieldToDb = (field, value) => {
  const toDb = getFieldAttr(field, 'toDb')
  return toDb && !isRaw(value) ? toDb(value) : value
}

// Convert fields coming back from the DB
const mapFieldsFromDb = (fields, data) => {
  if (isArray(data)) {
    return data.map((row) => mapFieldsFromDb(fields, row))
  }

  return reduce(data, function (data, value, key) {
    data[key] = mapFieldFromDb(fields[key], value)
    return data
  }, {})
}

// Convert fields going down to the DB
const mapFieldsToDb = (fields, data) => {
  if (isArray(data)) {
    return data.map((row) => mapFieldsToDb(fields, row))
  }

  return reduce(data, function (data, value, key) {
    data[key] = mapFieldToDb(fields[key], value)
    return data
  }, {})
}

module.exports = {
  FIELD_TYPES,
  mapSchemaFields,

  mapFieldFromDb,
  mapFieldToDb,
  mapFieldsFromDb,
  mapFieldsToDb
}
