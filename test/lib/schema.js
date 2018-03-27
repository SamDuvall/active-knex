/* global beforeEach describe it */
/* eslint-disable no-unused-expressions */
const _ = require('underscore')
const Promise = require('bluebird')
const {expect} = require('chai')
const Factory = require('../factory')
const Player = require('../examples/player')
const Team = require('../examples/team')
const knex = require('../knex')

describe('Schema', () => {
  var team
  var team2
  var teamBus
  var player
  var player2
  beforeEach(async () => {
    team = await Factory.create('team', {tags: ['alpha', 'beta']})
    team2 = await Factory.create('team', {archived: true})

    teamBus = await Factory.create('team.bus', {teamId: team.id})

    player = await Factory.create('player', {
      teamId: team.id,
      stats: {
        slugging: 0.456,
        bases: [1, 2, 3]
      }
    })
    player2 = await Factory.create('player', {teamId: team.id})
  })

  describe('fields', () => {
    it('should populate dates', () => {
      expect(team.createdAt).to.be.an.instanceOf(Date)
      expect(team.updatedAt).to.be.an.instanceOf(Date)
    })

    it('should parse booleans', () => {
      expect(team.archived).to.be.false
      expect(team2.archived).to.be.true
    })

    it('should parse json', () => {
      expect(player.stats).to.eql({
        slugging: 0.456,
        bases: [1, 2, 3]
      })
      expect(player2.stats).to.be.null
    })
  })

  describe('findById', () => {
    it('should find a record by ID', () => {
      return Team.findById(team.id).then(function (result) {
        expect(result.id).to.eql(team.id)
      })
    })

    it('should find a record by a ID (custom primaryKey)', () => {
      return Team.Bus.findById(team.id).then(function (result) {
        expect(result.teamId).to.eql(team.id)
      })
    })
  })

  describe('removeById @cleandb', () => {
    it('should remove a record by ID', () => {
      return Team.removeById(team2.id).then(() => {
        return Team.query()
      }).then(function (teams) {
        var ids = _.pluck(teams, 'id')
        expect(ids).to.eql([1])
      })
    })

    it('should remove a record by ID (custom primaryKey)', () => {
      return Team.Bus.removeById(team.id).then(() => {
        return Team.Bus.query()
      }).then(function (buses) {
        expect(buses).to.be.empty
      })
    })
  })

  describe('create', () => {
    describe('no transaction', () => {
      it('should create no records', () => {
        return Team.create([]).then(function (teams) {
          expect(teams).to.be.empty
        })
      })

      it('should create a single record', () => {
        return Team.create({name: 'Team Name'}).then(function (team) {
          expect(team.id).to.not.be.undefined
          expect(team.name).to.eql('Team Name')
        })
      })

      it('should create multiple records', () => {
        return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}]).then(function (teams) {
          var first = _.first(teams)
          var last = _.last(teams)
          expect(teams).to.have.length(3)
          expect(last.id - first.id).to.eql(2)
        })
      })

      it('should create a lot of records (in bulk)', function () {
        this.timeout(30000)

        var records = _.times(10000, function (index) {
          return { name: 'Bulk #' + (index + 1) }
        })

        return Team.create(records).then(function (teams) {
          expect(teams.length).to.eql(records.length)
          _.each(records, function (record, index) {
            var team = teams[index]
            expect(team.id).not.to.be.undefined
            expect(team.name).to.eql(record.name)
          })
        })
      })
    })

    describe('commit transaction', () => {
      it('should create a single record', () => {
        return knex.transaction(function (trx) {
          return Team.create({name: 'Team Name'}, trx).then(function (team) {
            expect(team.id).to.not.be.undefined
            expect(team.name).to.eql('Team Name')
          }).then(trx.commit)
        }).then(() => {
          return Team.findByName('Team Name')
        }).then(function (team) {
          expect(team).to.not.be.undefined
        })
      })

      it('should create multiple records @cleandb', () => {
        return knex.transaction(function (trx) {
          return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}], trx).then(function (teams) {
            var first = _.first(teams)
            var last = _.last(teams)
            expect(teams).to.have.length(3)
            expect(last.id - first.id).to.eql(2)
          }).then(trx.commit)
        }).then(() => {
          return Team.query()
        }).then(function (teams) {
          expect(teams).to.have.length(5)
        })
      })

      it('should create a lot of records (in bulk)', function () {
        this.timeout(30000)

        var records = _.times(10000, function (index) {
          return { name: 'Bulk #' + (index + 1) }
        })

        return knex.transaction(function (trx) {
          return Team.create(records, trx).then(function (teams) {
            expect(teams.length).to.eql(records.length)
            _.each(records, function (record, index) {
              var team = teams[index]
              expect(team.id).not.to.be.undefined
              expect(team.name).to.eql(record.name)
            })
          })
        })
      })
    })

    describe('rollback transaction @cleandb', () => {
      it('should NOT create a single record', () => {
        return knex.transaction(function (trx) {
          return Team.create({name: 'Team Name'}, trx).then(function (team) {
            expect(team.id).to.not.be.undefined
            expect(team.name).to.eql('Team Name')
          }).then(() => trx.rollback())
        }).catch(function () {
          return Team.findByName('Team Name')
        }).then(function (team) {
          expect(team).to.be.undefined
        })
      })

      it('should NOT create multiple records', () => {
        return knex.transaction(function (trx) {
          return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}], trx).then(function (teams) {
            var first = _.first(teams)
            var last = _.last(teams)
            expect(teams).to.have.length(3)
            expect(last.id - first.id).to.eql(2)
          }).then(trx.rollback)
        }).catch(function () {
          return Team.query()
        }).then(function (teams) {
          expect(teams).to.have.length(2)
        })
      })
    })
  })

  describe('bufferCreate', () => {
    describe('commit transaction', () => {
      it('should create multiple records', () => {
        return knex.transaction(function (trx) {
          return Promise.map([{name: 'Team One'}, {name: 'Team Two'}], function (params) {
            return Team.bufferCreate(params, trx)
          }).then(trx.commit)
        }).then(function (teams) {
          var names = _.pluck(teams, 'name')
          expect(names).to.eql(['Team One', 'Team Two'])
        })
      })
    })

    describe('rollback transaction @cleandb', () => {
      it('should NOT create multiple records', () => {
        return knex.transaction(function (trx) {
          return Promise.map([{name: 'Team One'}, {name: 'Team Two'}], function (params) {
            return Team.bufferCreate(params, trx)
          }).then(trx.rollback)
        }).catch(() => {
          return Team.findByName('Team One')
        }).then(function (team) {
          expect(team).to.be.undefined
        })
      })
    })
  })

  describe('update', () => {
    describe('no transaction', () => {
      it('should update a record (multiple)', () => {
        return Team.update(team, {archived: true, tags: null}).then(function (result) {
          return Team.findById(team.id)
        }).then(function (team) {
          expect(team.archived).to.be.true
          expect(team.tags).to.be.null
        })
      })

      it('should update a record (custom primaryKey)', () => {
        return Team.Bus.update(teamBus, {driver: 'New Driver'}).then(function (result) {
          return Team.Bus.findById(teamBus.teamId)
        }).then(function (teamBus) {
          expect(teamBus.driver).to.equal('New Driver')
        })
      })
    })

    describe('commit transaction', () => {
      it('should update a record', () => {
        return knex.transaction(function (trx) {
          return Team.update(team, {name: 'New Name'}, trx).then(function (team) {
            expect(team.name).to.eql('New Name')
          }).then(trx.commit)
        }).then(() => {
          return Team.findByName('New Name')
        }).then(function (team) {
          expect(team).to.not.be.undefined
        })
      })
    })

    describe('rollback transaction @cleandb', () => {
      it('should NOT update a record', () => {
        return knex.transaction(function (trx) {
          return Team.update(team, {name: 'New Name'}, trx).then(function (team) {
            expect(team.name).to.eql('New Name')
          }).then(trx.rollback)
        }).catch(() => {
          return Team.findByName('New Name')
        }).then(function (team) {
          expect(team).to.be.undefined
        })
      })
    })
  })

  describe('findOrCreate', () => {
    describe('no transaction', () => {
      it('should find a record', () => {
        return Team.findOrCreate({name: team.name}).then(function (result) {
          expect(result.id).to.eql(team.id)
        })
      })

      it('should create a record', () => {
        return Team.findOrCreate({name: 'New Name'}).then(function (result) {
          expect(result.id).to.not.eql(team.id)
        })
      })
    })

    describe('commit transaction', () => {
      it('should find a record', () => {
        return knex.transaction(function (trx) {
          return Team.findOrCreate({name: team.name}, trx).then(function (result) {
            expect(result.id).to.eql(team.id)
          }).then(trx.commit)
        })
      })

      it('should create a record', () => {
        return knex.transaction(function (trx) {
          return Team.findOrCreate({name: 'Team Name'}, trx).then(function (result) {
            expect(result.id).to.not.eql(team.id)
          }).then(trx.commit)
        }).then(() => {
          return Team.findByName('Team Name')
        }).then(function (team) {
          expect(team).to.not.be.undefined
        })
      })
    })

    describe('rollback transaction @cleandb', () => {
      it('should NOT create a record', () => {
        return knex.transaction(function (trx) {
          return Team.findOrCreate({name: 'Team Name'}, trx).then(function (result) {
            expect(result.id).to.not.eql(team.id)
          }).then(trx.rollback)
        }).catch(function () {
          return Team.findByName('Team Name')
        }).then(function (team) {
          expect(team).to.be.undefined
        })
      })
    })
  })

  describe('updateOrCreate', () => {
    it('should find a record', () => {
      return Team.updateOrCreate({name: team.name}).then(function (result) {
        expect(result.id).to.eql(team.id)
      })
    })

    it('should update a record', () => {
      return Team.updateOrCreate({name: team.name, archived: true}).then(function (result) {
        expect(result.id).to.eql(team.id)
        expect(result.archived).to.be.true
      })
    })

    it('should create a record', () => {
      return Team.updateOrCreate({name: 'New Name', archived: true}).then(function (result) {
        expect(result.id).to.not.eql(team.id)
        expect(result.archived).to.be.true
      })
    })
  })

  describe('query', () => {
    it('should create a custom query in the query builder', () => {
      return Team.query().whereName(team.name).first().then(function (team) {
        expect(team.id).to.eql(team.id)
      })
    })
  })

  describe('joins', () => {
    it('should only join once', () => {
      return Player.query().joins('teams', 'teams').where('teams.id', team.id).then(function (result) {
        expect(result).to.have.length(2)
      })
    })

    it('should query over a join', () => {
      return Player.query().whereTeamId(team.id).then(function (result) {
        expect(result).to.have.length(2)
      })
    })
  })

  describe('reload', () => {
    it('should reload attributes onto the object', () => {
      var name = player.name
      player.name = 'other name'
      player.extra = 'something'
      return Player.reload(player).then(() => {
        expect(player.name).to.eql(name)
        expect(player.extra).to.eql('something')
      })
    })
  })

  describe('load', () => {
    it('should load belongsTo', () => {
      return Player.load(player, 'team').then(function (player) {
        expect(player.team.id).to.eql(team.id)
      })
    })

    it('should load hasMany', () => {
      return Team.load(team, 'players').then(function (team) {
        expect(team.players).to.have.length(2)
      })
    })
  })
})
