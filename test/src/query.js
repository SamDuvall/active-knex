/* global beforeEach describe it */
/* eslint-disable no-unused-expressions */
const first = require('lodash/first')
const last = require('lodash/last')
const map = require('lodash/map')
const times = require('lodash/times')
const { expect } = require('chai')
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
    describe('no nulls', () => {
      it('should return the 1st 2 teams', async () => {
        const order = 'name'
        const rows = await Team.query().after(order).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 1', 'Team 2'])
      })

      it('should return the 2nd 2 teams', async () => {
        const order = 'name'
        let rows = await Team.query().after(order).select('teams.*').limit(2)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 3', 'Team 4'])
      })

      it('should return the Last 2 teams', async () => {
        const order = '-name'
        const rows = await Team.query().after(order).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 5', 'Team 4'])
      })

      it('should return the 2nd to Last 2 teams', async () => {
        const order = '-name'
        let rows = await Team.query().after(order).select('teams.*').limit(2)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 3', 'Team 2'])
      })
    })

    describe('with nulls', () => {
      beforeEach(async () => {
        const moreNames = times(3, (index) => ({ name: null }))
        const moreTeams = await Factory.create('team', moreNames)
        teams = [...teams, ...moreTeams]
      })

      it('should return the 1st 2 teams', async () => {
        const order = 'name'
        const rows = await Team.query().after(order).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql([null, null])
      })

      it('should return the 2nd 2 teams', async () => {
        const order = 'name'
        let rows = await Team.query().after(order).select('teams.*').limit(2)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql([null, 'Team 1'])
      })

      it('should return the 3rd 2 teams', async () => {
        const order = 'name'
        let rows = await Team.query().after(order).select('teams.*').limit(4)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 2', 'Team 3'])
      })

      it('should return the Last 2 teams', async () => {
        const order = '-name'
        const rows = await Team.query().after(order).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 5', 'Team 4'])
      })

      it('should return the 2nd to Last 2 teams', async () => {
        const order = '-name'
        let rows = await Team.query().after(order).select('teams.*').limit(2)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 3', 'Team 2'])
      })

      it('should return the 3rd to Last 2 teams', async () => {
        const order = '-name'
        let rows = await Team.query().after(order).select('teams.*').limit(4)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql(['Team 1', null])
      })

      it('should return the 4th to Last 2 teams', async () => {
        const order = '-name'
        let rows = await Team.query().after(order).select('teams.*').limit(6)
        const { sortKey } = last(rows)
        rows = await Team.query().after(order, sortKey).select('teams.*').limit(2)
        const result = map(rows, 'name')
        expect(result).to.eql([null, null])
      })
    })

    describe('multiple columns', () => {
      const columns = ['name', '-archived']

      beforeEach(async () => {
        const moreTeams = await Factory.create('team', times(5, (index) => ({
          name: `Team ${index + 1}`,
          archived: true
        })))

        teams = [...teams, ...moreTeams]
      })

      it('should return the 1st 3 teams', async () => {
        const rows = await Team.query().after(columns).select('teams.*').limit(3)

        const names = map(rows, 'name')
        const archiveds = map(rows, 'archived')
        expect(names).to.eql(['Team 1', 'Team 1', 'Team 2'])
        expect(archiveds).to.eql([true, false, true])
      })

      it('should return the 2nd 3 teams', async () => {
        let rows = await Team.query().after(columns).select('teams.*').limit(3)
        const { sortKey } = last(rows)
        rows = await Team.query().after(columns, sortKey).select('teams.*').limit(3)

        const names = map(rows, 'name')
        const archiveds = map(rows, 'archived')
        expect(names).to.eql(['Team 2', 'Team 3', 'Team 3'])
        expect(archiveds).to.eql([false, true, false])
      })
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
