var _ = require('underscore');
var Promise = require('bluebird');
var expect = require('chai').expect;
var Factory = require('../factory');
var Player = require('../examples/player');
var Team = require('../examples/team');
var knex = require('../knex');

describe('Schema',function() {
  var team;
  var team2;
  var teamBus;
  var player;
  var player2;
  beforeEachSync(function() {
    team = Factory.create('team', {tags: ['alpha', 'beta']});
    team2 = Factory.create('team', {archived: true});

    teamBus = Factory.create('team.bus', {teamId: team.id})

    player = Factory.create('player', {
      teamId: team.id,
      stats: {
        slugging: 0.456,
        bases: [1,2,3]
      }
    });
    player2 = Factory.create('player', {teamId: team.id});
  });

  describe('fields', function() {
    it('should populate dates', function() {
      expect(team.createdAt).to.be.a.Date;
      expect(team.updatedAt).to.be.a.Date;
    });

    it('should parse booleans', function() {
      expect(team.archived).to.be.false;
      expect(team2.archived).to.be.true;
    });

    it('should parse json', function() {
      expect(player.stats).to.eql({
        slugging: 0.456,
        bases: [1,2,3]
      });
      expect(player2.stats).to.be.null;
    });
  });

  describe('findById', function() {
    it('should find a record by ID', function() {
      return Team.findById(team.id).then(function(result) {
        expect(result.id).to.eql(team.id);
      });
    });

    it('should find a record by a ID (custom primaryKey)', function() {
      return Team.Bus.findById(team.id).then(function(result) {
        expect(result.teamId).to.eql(team.id);
      });
    });
  });

  describe('removeById', function() {
    it('should remove a record by ID', function() {
      return Team.removeById(team2.id).then(function() {
        return Team.query();
      }).then(function(teams) {
        var ids = _.pluck(teams, 'id');
        expect(ids).to.eql([1]);
      });
    });

    it('should remove a record by ID (custom primaryKey)', function() {
      return Team.Bus.removeById(team.id).then(function() {
        return Team.Bus.query();
      }).then(function(buses) {
        expect(buses).to.be.empty;
      });
    });
  });

  describe('create', function() {
    describe('no transaction', function() {
      it('should create no records', function() {
        return Team.create([]).then(function(teams) {
          expect(teams).to.be.empty;
        });
      });

      it('should create a single record', function() {
        return Team.create({name: 'Team Name'}).then(function(team) {
          expect(team.id).to.not.be.undefined;
          expect(team.name).to.eql('Team Name');
        });
      });

      it('should create multiple records', function() {
        return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}]).then(function(teams) {
          var first = _.first(teams);
          var last = _.last(teams);
          expect(teams).to.have.length(3);
          expect(last.id - first.id).to.eql(2);
        });
      });

      it('should create a lot of records (in bulk)', function() {
        this.timeout(30000);

        var records = _.times(10000, function(index) {
          return { name: 'Bulk #' + (index + 1) };
        });

        return Team.create(records).then(function(teams) {
          expect(teams.length).to.eql(records.length);
          _.each(records, function(record, index) {
            var team = teams[index];
            expect(team.id).not.to.be.undefined;
            expect(team.name).to.eql(record.name);
          });
        });
      });
    });

    describe('commit transaction', function() {
      it('should create a single record', function() {
        return knex.transaction(function(trx) {
          return Team.create({name: 'Team Name'}, trx).then(function(team) {
            expect(team.id).to.not.be.undefined;
            expect(team.name).to.eql('Team Name');
          }).then(trx.commit);
        }).then(function() {
          return Team.findByName('Team Name');
        }).then(function(team) {
          expect(team).to.not.be.undefined;
        });
      });

      it('should create multiple records', function() {
        return knex.transaction(function(trx) {
          return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}], trx).then(function(teams) {
            var first = _.first(teams);
            var last = _.last(teams);
            expect(teams).to.have.length(3);
            expect(last.id - first.id).to.eql(2);
          }).then(trx.commit);
        }).then(function() {
          return Team.query();
        }).then(function(teams) {
          expect(teams).to.have.length(5);
        });
      });

      it('should create a lot of records (in bulk)', function() {
        this.timeout(30000);

        var records = _.times(10000, function(index) {
          return { name: 'Bulk #' + (index + 1) };
        });

        return knex.transaction(function(trx) {
          return Team.create(records, trx).then(function(teams) {
            expect(teams.length).to.eql(records.length);
            _.each(records, function(record, index) {
              var team = teams[index];
              expect(team.id).not.to.be.undefined;
              expect(team.name).to.eql(record.name);
            });
          });
        });
      });
    });

    describe('rollback transaction', function() {
      it('should NOT create a single record', function() {
        return knex.transaction(function(trx) {
          return Team.create({name: 'Team Name'}, trx).then(function(team) {
            expect(team.id).to.not.be.undefined;
            expect(team.name).to.eql('Team Name');
          }).then(trx.rollback);
        }).catch(function(err) {
          expect(err).to.be.undefined;
          return Team.findByName('Team Name');
        }).then(function(team) {
          expect(team).to.be.undefined;
        });
      });

      it('should NOT create multiple records', function() {
        return knex.transaction(function(trx) {
          return Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}], trx).then(function(teams) {
            var first = _.first(teams);
            var last = _.last(teams);
            expect(teams).to.have.length(3);
            expect(last.id - first.id).to.eql(2);
          }).then(trx.rollback);
        }).catch(function(err) {
          expect(err).to.be.undefined;
          return Team.query();
        }).then(function(teams) {
          expect(teams).to.have.length(2);
        });
      });
    });
  });

  describe('batchCreate', function() {
    describe('commit transaction', function() {
      it('should create multiple records', function() {
        return knex.transaction(function(trx) {
          return Promise.map([{name: 'Team One'}, {name: 'Team Two'}], function(params) {
            return Team.batchCreate(params, trx);
          }).then(trx.commit);
        }).then(function(teams) {
          var names = _.pluck(teams, 'name');
          expect(names).to.eql(['Team One', 'Team Two']);
        });
      });
    });

    describe('rollback transaction', function() {
      it('should NOT create multiple records', function() {
        return knex.transaction(function(trx) {
          return Promise.map([{name: 'Team One'}, {name: 'Team Two'}], function(params) {
            return Team.batchCreate(params, trx);
          }).then(trx.rollback);
        }).catch(function() {
          return Team.findByName('Team One');
        }).then(function(team) {
          expect(team).to.be.undefined;
        });
      });
    });
  });

  describe('update', function() {
    describe('no transaction', function() {
      it('should update a record', function() {
        return Team.update(team, {archived: true, tags: null}).then(function(result) {
          return Team.findById(team.id);
        }).then(function(team) {
          expect(team.archived).to.be.true;
          expect(team.tags).to.be.null;
        });
      });

      it('should update a record (custom primaryKey)', function() {
        return Team.Bus.update(teamBus, {driver: 'New Driver'}).then(function(result) {
          return Team.Bus.findById(teamBus.teamId);
        }).then(function(teamBus) {
          expect(teamBus.driver).to.equal('New Driver');
        });
      });
    });

    describe('commit transaction', function() {
      it('should update a record', function() {
        return knex.transaction(function(trx) {
          return Team.update(team, {name: 'New Name'}, trx).then(function(team) {
            expect(team.name).to.eql('New Name');
          }).then(trx.commit);
        }).then(function() {
          return Team.findByName('New Name');
        }).then(function(team) {
          expect(team).to.not.be.undefined;
        });
      });
    });

    describe('rollback transaction', function() {
      it('should NOT update a record', function() {
        return knex.transaction(function(trx) {
          return Team.update(team, {name: 'New Name'}, trx).then(function(team) {
            expect(team.name).to.eql('New Name');
          }).then(trx.rollback);
        }).catch(function() {
          return Team.findByName('New Name');
        }).then(function(team) {
          expect(team).to.be.undefined;
        });
      });
    });
  });

  describe('findOrCreate', function() {
    describe('no transaction', function() {
      it('should find a record', function() {
        return Team.findOrCreate({name: team.name}).then(function(result) {
          expect(result.id).to.eql(team.id);
        });
      });

      it('should create a record', function() {
        return Team.findOrCreate({name: 'New Name'}).then(function(result) {
          expect(result.id).to.not.eql(team.id);
        });
      });
    });

    describe('commit transaction', function() {
      it('should find a record', function() {
        return knex.transaction(function(trx) {
          return Team.findOrCreate({name: team.name}, trx).then(function(result) {
            expect(result.id).to.eql(team.id);
          }).then(trx.commit);
        });
      });

      it('should create a record', function() {
        return knex.transaction(function(trx) {
          return Team.findOrCreate({name: 'Team Name'}, trx).then(function(result) {
            expect(result.id).to.not.eql(team.id);
          }).then(trx.commit);
        }).then(function() {
          return Team.findByName('Team Name');
        }).then(function(team) {
          expect(team).to.not.be.undefined;
        });
      });
    });

    describe('rollback transaction', function() {
      it('should NOT create a record', function() {
        return knex.transaction(function(trx) {
          return Team.findOrCreate({name: 'Team Name'}, trx).then(function(result) {
            expect(result.id).to.not.eql(team.id);
          }).then(trx.rollback);
        }).catch(function(err) {
          expect(err).to.be.undefined;
          return Team.findByName('Team Name');
        }).then(function(team) {
          expect(team).to.be.undefined;
        });
      });
    });
  });

  describe('updateOrCreate', function() {
    it('should find a record', function() {
      return Team.updateOrCreate({name: team.name}).then(function(result) {
        expect(result.id).to.eql(team.id);
      });
    });

    it('should update a record', function() {
      return Team.updateOrCreate({name: team.name, archived: true}).then(function(result) {
        expect(result.id).to.eql(team.id);
        expect(result.archived).to.be.true;
      });
    });

    it('should create a record', function() {
      return Team.updateOrCreate({name: 'New Name', archived: true}).then(function(result) {
        expect(result.id).to.not.eql(team.id);
        expect(result.archived).to.be.true;
      });
    });
  });

  describe('query', function() {
    it('should create a custom query in the query builder', function() {
      return Team.query().whereName(team.name).first().then(function(team) {
        expect(team.id).to.eql(team.id);
      });
    });
  });

  describe('joins', function() {
    it('should only join once', function() {
      return Player.query().joins('teams', 'teams').where('teams.id', team.id).then(function(result) {
        expect(result).to.have.length(2);
      });
    });

    it('should query over a join', function() {
      return Player.query().whereTeamId(team.id).then(function(result) {
        expect(result).to.have.length(2);
      });
    });
  });

  describe('reload', function() {
    it('should reload attributes onto the object', function() {
      var name = player.name;
      player.name = 'other name';
      player.extra = 'something';
      return Player.reload(player).then(function() {
        expect(player.name).to.eql(name);
        expect(player.extra).to.eql('something');
      });
    });
  });

  describe('load', function() {
    it('should load belongsTo', function() {
      return Player.load(player, 'team').then(function(player) {
        expect(player.team.id).to.eql(team.id)
      });
    });

    it('should load hasMany', function() {
      return Team.load(team, 'players').then(function(team) {
        expect(team.players).to.have.length(2);
      });
    });
  });

  describe('events', function() {
    it('should trigger create events', function() {
      var beforeCount = 0;
      Player.before('create', function() {
        beforeCount += 1;
      });

      var afterCount = 0;
      Player.after('create', function() {
        afterCount += 1;
      });

      return Player.create({teamId: team.id, email: 'A@A.COM', name: 'New Name'}).then(function(player) {
        expect(player.email).to.eql('a@a.com');
        expect(beforeCount).to.eql(1);
        expect(afterCount).to.eql(1);
      });
    });

    it('should trigger update events', function() {
      var beforeCount = 0;
      Player.before('update', function() {
        beforeCount += 1;
      });

      var afterCount = 0;
      Player.after('update', function() {
        afterCount += 1;
      });

      return Player.update(team, {email: 'A@A.COM', name: 'New Name'}).then(function(player) {
        expect(player.email).to.eql('a@a.com');
        expect(beforeCount).to.eql(1);
        expect(afterCount).to.eql(1);
      });
    });
  });
});
