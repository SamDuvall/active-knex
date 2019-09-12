/* global beforeEach describe it */
/* eslint-disable no-unused-expressions */
const first = require('lodash/first')
const last = require('lodash/last')
const map = require('lodash/map')
const pick = require('lodash/pick')
const times = require('lodash/times')
const { expect } = require('chai')
const Factory = require('../factory')
const Player = require('../examples/player')
const Team = require('../examples/team')
const knex = require('../knex')
const { arrayify } = require('../../index')

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
      var teamIds = map(players, 'teamId')
      return Player.query().whereIn('teamId', teamIds).then(function (players) {
        var result = map(players, 'teamId')
        expect(result).to.eql(teamIds)
      })
    })
  })

  describe('orderBy', () => {
    describe('single column', () => {
      it('be ASC with no direction', () => {
        return Team.query().orderBy('name').first().then(function (team) {
          expect(team.name).to.eql('Team 1')
        })
      })

      it('be DESC with direction', () => {
        return Team.query().orderBy('name', 'desc').first().then(function (team) {
          expect(team.name).to.eql('Team 5')
        })
      })

      it('be DESC with -', () => {
        return Team.query().orderBy('-name').first().then(function (team) {
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
        return Team.query().orderBy(['name', 'archived']).first().then(function (team) {
          expect(team.name).to.eql('Team 1')
          expect(team.archived).to.be.false
        })
      })

      it('be ASC/DESC', () => {
        return Team.query().orderBy(['name', '-archived']).first().then(function (team) {
          expect(team.name).to.eql('Team 1')
          expect(team.archived).to.be.true
        })
      })

      it('be DESC/ASC', () => {
        return Team.query().orderBy(['-name', 'archived']).first().then(function (team) {
          expect(team.name).to.eql('Team 5')
          expect(team.archived).to.be.false
        })
      })

      it('be DESC/DESC', () => {
        return Team.query().orderBy(['-name', '-archived']).first().then(function (team) {
          expect(team.name).to.eql('Team 5')
          expect(team.archived).to.be.true
        })
      })
    })
  })

  describe('after', () => {
    const runTest = (test) => {
      const { order, step } = test
      const orderName = arrayify(order).join(', ')
      it(`should order by ${orderName} by ${step}s`, async () => {
        let index = 0
        let lastRow
        while (index < test.expected.length) {
          // Get rows
          const { sortKey } = lastRow || {}
          const expected = test.expected.slice(index, index + step)
          const qb = Team.query().after(order, sortKey).select('teams.*').limit(expected.length)
          const rows = await qb
          lastRow = last(rows)

          // Compare results
          expect(rows.length).to.eql(expected.length)
          expected.forEach((expected, index) => {
            const keys = Object.keys(expected)
            const actual = pick(rows[index], keys)
            expect(expected).to.eql(actual)
          })

          index += step
        }
      })
    }

    describe('no nulls', () => {
      const tests = [{
        order: 'name',
        step: 2,
        expected: [{
          name: 'Team 1'
        }, {
          name: 'Team 2'
        }, {
          name: 'Team 3'
        }, {
          name: 'Team 4'
        }]
      }, {
        order: '-name',
        step: 2,
        expected: [{
          name: 'Team 5'
        }, {
          name: 'Team 4'
        }, {
          name: 'Team 3'
        }, {
          name: 'Team 2'
        }]
      }]

      tests.forEach(runTest)
    })

    describe('with nulls', () => {
      beforeEach(async () => {
        const moreNames = times(3, (index) => ({ name: null }))
        const moreTeams = await Factory.create('team', moreNames)
        teams = [...teams, ...moreTeams]
      })

      const tests = [{
        order: 'name',
        step: 2,
        expected: [{
          name: null
        }, {
          name: null
        }, {
          name: null
        }, {
          name: 'Team 1'
        }, {
          name: 'Team 2'
        }, {
          name: 'Team 3'
        }, {
          name: 'Team 4'
        }, {
          name: 'Team 5'
        }]
      }, {
        order: '-name',
        step: 2,
        expected: [{
          name: 'Team 5'
        }, {
          name: 'Team 4'
        }, {
          name: 'Team 3'
        }, {
          name: 'Team 2'
        }, {
          name: 'Team 1'
        }, {
          name: null
        }, {
          name: null
        }, {
          name: null
        }]
      }, {
        order: '-name DESC',
        step: 2,
        expected: [{
          name: 'Team 1'
        }, {
          name: 'Team 2'
        }, {
          name: 'Team 3'
        }, {
          name: 'Team 4'
        }, {
          name: 'Team 5'
        }, {
          name: null
        }, {
          name: null
        }, {
          name: null
        }]
      }]

      tests.forEach(runTest)
    })

    describe('multiple columns', () => {
      beforeEach(async () => {
        const moreTeams = await Factory.create('team', times(5, (index) => ({
          name: `Team ${index + 1}`,
          archived: true
        })))

        teams = [...teams, ...moreTeams]
      })

      const tests = [{
        order: ['name', '-archived'],
        step: 3,
        expected: [{
          archived: true,
          name: 'Team 1'
        }, {
          archived: false,
          name: 'Team 1'
        }, {
          archived: true,
          name: 'Team 2'
        }, {
          archived: false,
          name: 'Team 2'
        }, {
          archived: true,
          name: 'Team 3'
        }, {
          archived: false,
          name: 'Team 3'
        }]
      }, {
        order: ['-name', 'archived'],
        step: 3,
        expected: [{
          archived: false,
          name: 'Team 5'
        }, {
          archived: true,
          name: 'Team 5'
        }, {
          archived: false,
          name: 'Team 4'
        }, {
          archived: true,
          name: 'Team 4'
        }, {
          archived: false,
          name: 'Team 3'
        }, {
          archived: true,
          name: 'Team 3'
        }]
      }]

      tests.forEach(runTest)
    })
  })

  describe('update', () => {
    it('should update a record (single)', () => {
      var team = first(teams)
      return Team.where('id', team.id).update('tags', ['chicago', 'dc']).then(function (result) {
        return Team.findById(team.id)
      }).then(function (team) {
        expect(team.tags).to.eql(['chicago', 'dc'])
      })
    })

    it('should update a record (multiple)', () => {
      var team = first(teams)
      return Team.where('id', team.id).update({ tags: ['chicago', 'dc'] }).then(function (result) {
        return Team.findById(team.id)
      }).then(function (team) {
        expect(team.tags).to.eql(['chicago', 'dc'])
      })
    })

    it('should update using raw values (multiple)', () => {
      var player = first(players)
      return Player.query().where('id', player.id).update({
        stats: knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')
      }).then(() => {
        return Player.findById(player.id)
      }).then(function (result) {
        expect(result.stats.positions).to.eql(['1B', '3B'])
      })
    })

    it('should update using raw values (single)', () => {
      var player = first(players)
      return Player.query().where('id', player.id).update('stats', knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')).then(() => {
        return Player.findById(player.id)
      }).then(function (result) {
        expect(result.stats.positions).to.eql(['1B', '3B'])
      })
    })

    it('should update using raw values (multiple)', () => {
      var player = first(players)
      return Player.query().where('id', player.id).update({
        stats: knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')
      }).then(() => {
        return Player.findById(player.id)
      }).then(function (result) {
        expect(result.stats.positions).to.eql(['1B', '3B'])
      })
    })
  })
})
