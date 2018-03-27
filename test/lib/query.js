const _ = require('underscore')
const times = require('lodash/times')
const Promise = require('bluebird')
const {expect} = require('chai')
const camelize = require('../../lib/query/camelize')
const Factory = require('../factory')
const Player = require('../examples/player')
const Team = require('../examples/team')
const knex = require('../knex')

describe('Query @cleandb', () => {
  var teams
  var players
  beforeEach(async () => {
    teams = await Factory.create('team', times(5, (index) => ({
      name: `Team ${index + 1}`
    })))

    players = await Factory.create('player', teams.map((team) => ({
      teamId: team.id,
      stats: {
        positions: ['1B', 'SS', '3B']
      }
    })))
  })

  describe('camelize', () => {
    it('should convert to snake_case and back', () => {
      var teamIds = _.pluck(players, 'teamId')
      return Player.query().whereIn('teamId', teamIds).then(function(players) {
        var result = _.pluck(players, 'teamId')
        expect(result).to.eql(teamIds)
      })
    })
  })

  describe('defer', () => {
    it('should run a deferred operation', () => {
      return Team.query().defer(function(qb) {
        return Team.query().then(function(teams) {
          var ids = _.pluck(teams, 'id')
          var id = _.first(ids)
          qb.where('id', id)
        })
      }).limit(2).then(function(result) {
        var names = _.pluck(result, 'name')
        expect(names).to.eql(['Team 1'])
      })
    })
  })

  describe('orderBy', () => {
    describe('single column', () => {
      it('be ASC with no direction', () => {
        return Team.query().orderBy('name').first().then(function(team) {
          expect(team.name).to.eql('Team 1')
        })
      })

      it('be DESC with direction', () => {
        return Team.query().orderBy('name', 'desc').first().then(function(team) {
          expect(team.name).to.eql('Team 5')
        })
      })

      it('be DESC with -', () => {
        return Team.query().orderBy('-name').first().then(function(team) {
          expect(team.name).to.eql('Team 5')
        })
      })
    })

    describe('multiple columns', () => {
      beforeEach(async () => {
        await Factory.create('team', times(5, (index) => ({
          name: `Team ${index + 1}`,
          archived: true
        })))
      })

      it('be ASC/ASC', () => {
        return Team.query().orderBy(['name', 'archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 1')
          expect(team.archived).to.be.false
        })
      })

      it('be ASC/DESC', () => {
        return Team.query().orderBy(['name', '-archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 1')
          expect(team.archived).to.be.true
        })
      })

      it('be DESC/ASC', () => {
        return Team.query().orderBy(['-name', 'archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 5')
          expect(team.archived).to.be.false
        })
      })

      it('be DESC/DESC', () => {
        return Team.query().orderBy(['-name', '-archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 5')
          expect(team.archived).to.be.true
        })
      })
    })

    describe('custom ordering', () => {
      beforeEach(async () => {
        await Factory.create('team', times(5, (index) => ({
          name: `Team ${index + 1}`,
          archived: true
        })))
      })

      it('be ASC', () => {
        return Team.query().orderBy('custom').first().then(function(team) {
          expect(team.name).to.eql('Team 1')
          expect(team.archived).to.be.false
        })
      })

      it('be DESC', () => {
        return Team.query().orderBy('-custom').first().then(function(team) {
          expect(team.name).to.eql('Team 5')
          expect(team.archived).to.be.true
        })
      })
    })
  })

  describe('after', () => {
    describe('no nulls', () => {
      it('should return the 1st 2 teams', () => {
        return Team.query().after('name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 1', 'Team 2'])
        })
      })

      it('should return the 2nd 2 teams', () => {
        return Team.query().after('name').limit(2).then(function(result) {
          var last = _.last(result)
          return Team.query().after('name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 3', 'Team 4'])
        })
      })

      it('should return the Last 2 teams', () => {
        return Team.query().after('-name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 5', 'Team 4'])
        })
      })

      it('should return the 2nd to Last 2 teams', () => {
        return Team.query().after('-name', 4).limit(2).then(function(result) {
          var last = _.last(result)
          return Team.query().after('-name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 3', 'Team 2'])
        })
      })
    })

    describe('with nulls', () => {
      beforeEach(async () => {
        const moreTeams = await Factory.create('team', times(3, (index) => ({
          name: null
        })))

        teams = [...teams, ...moreTeams]
      })

      it('should return the 1st 2 teams', () => {
        return Team.query().after('name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql([null, null])
        })
      })

      it('should return the 2nd 2 teams', () => {
        return Team.query().after('name').limit(2).then(function(result) {
          var last = _.last(result)
          return Team.query().after('name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql([null, 'Team 1'])
        })
      })

      it('should return the 3rd 2 teams', () => {
        return Team.query().after('name').limit(4).then(function(result) {
          var last = _.last(result)
          return Team.query().after('name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 2', 'Team 3'])
        })
      })

      it('should return the Last 2 teams', () => {
        return Team.query().after('-name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 5', 'Team 4'])
        })
      })

      it('should return the 2nd to Last 2 teams', () => {
        return Team.query().after('-name', 4).limit(2).then(function(result) {
          var last = _.last(result)
          return Team.query().after('-name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 3', 'Team 2'])
        })
      })

      it('should return the 3rd to Last 2 teams', () => {
        return Team.query().after('-name', 4).limit(4).then(function(result) {
          var last = _.last(result)
          return Team.query().after('-name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql(['Team 1', null])
        })
      })

      it('should return the 4th to Last 2 teams', () => {
        return Team.query().after('-name', 4).limit(6).then(function(result) {
          var last = _.last(result)
          return Team.query().after('-name', last.name, last.id).limit(2)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          expect(names).to.eql([null, null])
        })
      })
    })

    describe('multiple columns', () => {
      var columns = ['name', '-archived']

      beforeEach(async () => {
        const moreTeams = await Factory.create('team', times(5, (index) => ({
          name: `Team ${index + 1}`,
          archived: true
        })))

        teams = [...teams, ...moreTeams]
      })

      it('should return the 1st 3 teams', () => {
        return Team.query().after(columns).limit(3).then(function(result) {
          var names = _.pluck(result, 'name')
          var archiveds = _.pluck(result, 'archived')
          expect(names).to.eql(['Team 1', 'Team 1', 'Team 2'])
          expect(archiveds).to.eql([true, false, true])
        })
      })

      it('should return the 2nd 3 teams', () => {
        return Team.query().after(columns).limit(3).then(function(result) {
          var last = _.last(result)
          var lastValues = [last.name, last.archived]
          return Team.query().after(columns, lastValues, last.id).limit(3)
        }).then(function(result) {
          var names = _.pluck(result, 'name')
          var archiveds = _.pluck(result, 'archived')
          expect(names).to.eql(['Team 2', 'Team 3', 'Team 3'])
          expect(archiveds).to.eql([false, true, false])
        })
      })
    })
  })

  describe('afterId', () => {
    it('should return the 1st 2 teams', () => {
      return Team.query().afterId('name').limit(2).then(function(result) {
        var names = _.pluck(result, 'name')
        expect(names).to.eql(['Team 1', 'Team 2'])
      })
    })

    it('should return 2 teams after', () => {
      var team = teams[2]
      return Team.query().afterId('name', team.id).limit(2).then(function(result) {
        var names = _.pluck(result, 'name')
        expect(names).to.eql(['Team 4', 'Team 5'])
      })
    })
  })

  describe('update', () => {
    it('should update a record (single)', () => {
      var team = _.first(teams)
      return Team.where('id', team.id).update('tags', ['chicago', 'dc']).then(function(result) {
        return Team.findById(team.id)
      }).then(function(team) {
        expect(team.tags).to.eql(['chicago', 'dc'])
      })
    })

    it('should update a record (multiple)', () => {
      var team = _.first(teams)
      return Team.where('id', team.id).update({tags: ['chicago', 'dc']}).then(function(result) {
        return Team.findById(team.id)
      }).then(function(team) {
        expect(team.tags).to.eql(['chicago', 'dc'])
      })
    })

    it('should update using raw values (multiple)', () => {
      var player = _.first(players)
      return Player.query().where('id', player.id).update({
        stats: knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')
      }).then(() => {
        return Player.findById(player.id)
      }).then(function(result) {
        expect(result.stats.positions).to.eql(['1B','3B'])
      })
    })

    it('should update using raw values (single)', () => {
      var player = _.first(players)
      return Player.query().where('id', player.id).update('stats', knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')).then(() => {
        return Player.findById(player.id)
      }).then(function(result) {
        expect(result.stats.positions).to.eql(['1B','3B'])
      })
    })

    it('should update using raw values (multiple)', () => {
      var player = _.first(players)
      return Player.query().where('id', player.id).update({
        stats: knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')
      }).then(() => {
        return Player.findById(player.id)
      }).then(function(result) {
        expect(result.stats.positions).to.eql(['1B','3B'])
      })
    })
  })
})
