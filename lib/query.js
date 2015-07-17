var Promise = require('bluebird');
var _ = require('underscore');
var util = require('./util');

module.exports = function(knex, tableName, fields, joins, queries, events) {
  var table = knex(tableName);
  var query = Object.create(table);

  // Find in fields
  _.each(fields, function(field, name) {
    // Fill in to/from db from type
    if (field.type) {
      if (!field.fromDb) field.fromDb = util.fromDb[field.type];
      if (!field.toDb) field.toDb = util.toDb[field.type];
    }
  });

  function fromDb(data) {
    if (_.isArray(data)) return _.map(data, fromDb);

    data = util.camelize(data);
    _.each(fields, function(field, name) {
      if (!field.fromDb || data[name] == undefined) return;
      data[name] = field.fromDb(data[name]);
    });
    return data;
  }

  function toDb(data) {
    if (_.isArray(data)) return _.map(data, toDb);

    data = _.clone(data);
    _.each(fields, function(field, name) {
      if (!field.toDb || data[name] == undefined) return;
      data[name] = field.toDb(data[name]);
    });
    data = util.underscored(data);
    return data;
  }

  function setDefaults(data) {
    _.each(fields, function(field, name) {
      if (field.default == undefined) return;
      data[name] = data[name] || field.default;
    });
  }

  _.extend(query, queries);

  query.then = function(onFulfilled, onRejected) {
    var method = this._method || 'select';
    var isSelect = _.include(['select', 'first'], method);
    return table.then.call(this, function(result) {
      if (isSelect && result) result = fromDb(result);
      return onFulfilled(result);
    }, onRejected);
  }

  query.insert = function(data, returning) {
    setDefaults(data);

    var query = this;
    return events.triggerBeforeAndAfter('save', data, function(data) {
      var params = toDb(data);
      return table.insert.call(query, params, returning).then(function(ids) {
        var insertId = _.first(ids);
        if (!data.id) data.id = insertId;
        return data;
      });
    });
  }

  query.update = function(data, returning) {
    var query = this;
    return events.triggerBeforeAndAfter('save', data, function(data) {
      var params = toDb(data);
      return table.update.call(query, params, returning);
    });
  }

  query.orderBy = function(column) {
    if (column[0] != '-') return table.orderBy.apply(this, arguments);

    var column = column.substr(1);
    return table.orderBy.call(this, column, 'desc');
  }

  // Get the entries after the last value in the order provided
  query.after = function(column, id) {
    if (!id) return this.orderBy(column);

    column = column || 'id';
    var desc = (column[0] == '-');
    var field = desc ? column.substr(1) : column;
    var sign = desc ? '<' : '>';

    var sub = ['(SELECT', field, 'FROM', tableName, 'WHERE id=?)'].join(' ');
    var where = [field, sign, sub].join(' ');
    return this.whereRaw(where, [id]).orderBy(column);
  }

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

  query.joins = function() {
    var qb = this;
    _.each(arguments, function(name) {

      // Go through the dots
      var from = tableName;
      _.each(name.split('.'), function(to) {
        if (!isJoined(qb, from, to)) {
          var joinsFrom = joins[from];
          if (joinsFrom) var join = joinsFrom[to];
          if (!join) throw ['No join from', from, 'to', to].join(' ');

          join(this);
          addJoined(qb, from, to);
        }

        from = to;
      }, this);

    }, this);

    return this;
  }

  return query;
}
