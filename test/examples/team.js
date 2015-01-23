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
    findByName: function(name) {
      return this.where('teams.name', name).first();
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

module.exports = Team;
