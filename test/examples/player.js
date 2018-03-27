const ActiveKnex = require('../../index')
const knex = require('../knex')

var Player = ActiveKnex.Schema.create(knex, {
  tableName: 'players',

  fields: {
    stats: { type: 'json' },
    createdAt: true,
    updatedAt: true
  },

  joins: {
    teams: function (qb) {
      return qb.leftJoin('teams', 'players.team_id', 'teams.id')
    }
  },

  queries: {
    whereTeamId: function (id) {
      return this.joins('teams').where('teams.id', id)
    }
  },

  relations: {
    team: () => {
      var Team = require('./team')
      return ActiveKnex.Relation.BelongsTo({
        model: Team,
        foreignKey: 'team_id'
      })
    }
  }
})

module.exports = Player
