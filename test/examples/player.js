var _ = require('underscore');
var ActiveKnex = require('../../index');
var knex = require('../knex');

var Player = ActiveKnex.Schema.create(knex, {
  tableName: 'players',

  fields: {
    stats: { type: 'json' },
    createdAt: true,
    updatedAt: true
  },

  joins: {
    teams: function(qb) {
      return qb.leftJoin('teams', 'players.team_id', 'teams.id');
    }
  },

  queries: {
    whereTeamId: function(id) {
      return this.joins('teams').where('teams.id', id);
    }
  },

  relations: {
    team: function() {
      var Team = require('./team');
      return ActiveKnex.Relation.BelongsTo({
        model: Team,
        foreignKey: 'team_id'
      });
    }
  }
});

Player.before('save', function(player) {
  if (player.email) player.email = player.email.toLowerCase();
});

module.exports = Player;
