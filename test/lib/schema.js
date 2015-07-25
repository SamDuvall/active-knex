var _ = require('underscore');
var expect = require('chai').expect;
var Factory = require('../factory');
var Player = require('../examples/player');
var Team = require('../examples/team');

describe('Schema',function() {
  var team;
  var team2;
  var player;
  var player2;
  beforeEachSync(function() {
    team = Factory.create('team');
    team2 = Factory.create('team', {archived: true});
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
      expect(player2.stats).to.be.undefined;
    });
  });

  describe('findById', function() {
    it('should find a record by ID', function(done) {
      Team.findById(team.id).then(function(result) {
        expect(result.id).to.eql(team.id);
      }).then(done, done);
    });
  });

  describe('removeById', function() {
    it('should remove a record by ID', function(done) {
      Team.removeById(team2.id).then(function() {
        return Team.query();
      }).then(function(teams) {
        var ids = _.pluck(teams, 'id');
        expect(ids).to.eql([1]);
      }).then(done, done);
    });
  });

  describe('create', function() {
    it('create a single record', function(done) {
      Team.create({name: team.name}).then(function(result) {
        expect(result.id).to.not.be.undefined;
      }).then(done, done);
    });

    it('create multiple records', function(done) {
      Team.create([{name: 'Team One'}, {name: 'Team Two'}, {name: 'Team Three'}]).then(function(result) {
        var first = _.first(result);
        var last = _.last(result);
        expect(result).to.have.length(3);
        expect(last.id - first.id).to.eql(2);
      }).then(done, done);
    });
  });

  describe('findOrCreate', function() {
    it('should find a record', function(done) {
      Team.findOrCreate({name: team.name}).then(function(result) {
        expect(result.id).to.eql(team.id);
      }).then(done, done);
    });

    it('should create a record', function(done) {
      Team.findOrCreate({name: 'New Name'}).then(function(result) {
        expect(result.id).to.not.eql(team.id);
      }).then(done, done);
    });
  });

  describe('updateOrCreate', function() {
    it('should update a record', function(done) {
      Team.updateOrCreate({name: team.name, archived: true}).then(function(result) {
        expect(result.id).to.eql(team.id);
        expect(result.archived).to.be.true;
      }).then(done, done);
    });

    it('should create a record', function(done) {
      Team.updateOrCreate({name: 'New Name', archived: true}).then(function(result) {
        expect(result.id).to.not.eql(team.id);
        expect(result.archived).to.be.true;
      }).then(done, done);
    });
  });

  describe('query', function() {
    it('should create a custom query in the query builder', function(done) {
      Team.query().findByName(team.name).then(function(result) {
        expect(result.id).to.eql(team.id);
      }).then(done, done);
    });
  });

  describe('joins', function() {
    it('should only join once', function(done) {
      Player.query().joins('teams', 'teams').where('teams.id', team.id).then(function(result) {
        expect(result).to.have.length(2);
      }).then(done, done);
    });

    it('should query over a join', function(done) {
      Player.query().whereTeamId(team.id).then(function(result) {
        expect(result).to.have.length(2);
      }).then(done, done);
    });
  });

  describe('load', function() {
    it('should load hasMany', function(done) {
      Team.load(team, 'players').then(function(team) {
        expect(team.players).to.have.length(2);
      }).then(done, done);
    });
  });

  describe('events', function() {
    it('should trigger create events', function(done) {
      var beforeCount = 0;
      Player.before('create', function() {
        beforeCount += 1;
      });

      var afterCount = 0;
      Player.after('create', function() {
        afterCount += 1;
      });

      Player.create({email: 'A@A.COM', name: 'New Name'}).then(function(player) {
        expect(player.email).to.eql('a@a.com');
        expect(beforeCount).to.eql(1);
        expect(afterCount).to.eql(1);
      }).then(done, done);
    });

    it('should trigger update events', function(done) {
      var beforeCount = 0;
      Player.before('update', function() {
        beforeCount += 1;
      });

      var afterCount = 0;
      Player.after('update', function() {
        afterCount += 1;
      });

      Player.update(team, {email: 'A@A.COM', name: 'New Name'}).then(function(player) {
        expect(player.email).to.eql('a@a.com');
        expect(beforeCount).to.eql(1);
        expect(afterCount).to.eql(1);
      }).then(done, done);
    });
  });
});
