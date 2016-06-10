var _ = require('underscore');
var ActiveKnex = require('../../index');
var knex = require('../knex');

var Team = ActiveKnex.Schema.create(knex, {
  tableName: 'teams',
  keys: ['name'],

  fields: {
    archived: { type: 'boolean', default: false },
    createdAt: true,
    updatedAt: true
  },

  joins: {
    players: function(qb) {
      return qb.leftJoin('players', 'teams.id', 'players.team_id');
    }
  },

  queries: {
    whereName: function(name) {
      return this.where('teams.name', name);
    }
  },

  relations: {
    players: function() {
      var Player = require('./player');
      return ActiveKnex.Relation.HasMany({
        model: Player,
        foreignKey: 'team_id'
      });
    }
  }
});

Team.findByName = function(name) {
  return this.query().whereName(name).first();
};

Team.Bus = ActiveKnex.Schema.create(knex, {
  tableName: 'team_buses',
  primaryKey: 'teamId'
});

module.exports = Team;
