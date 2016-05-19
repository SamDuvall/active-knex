var _ = require('underscore');
var expect = require('chai').expect;
var camelize = require('../../lib/query/camelize');
var Factory = require('../factory');
var Player = require('../examples/player');
var Team = require('../examples/team');

describe('Query',function() {
  var teams;
  var players;
  beforeEachSync(function() {
    teams = _.times(5, function(index) {
      return Factory.create('team', {name: 'Team ' + (index + 1)});
    });

    players = _.map(teams, function(team) {
      return Factory.create('player', {teamId: team.id});
    });
  });

  describe('camelize', function() {
    describe('toSnakeCase', function() {
      var examples = [{
        before: 'select * from `tableName` order by `teamId` asc limit ?',
        after:  'select * from `table_name` order by `team_id` asc limit ?'
      }, {
        before: 'insert into `tableName` (`createdAt`, `name`, `teamId`, `s3Key`, `updatedAt`) values (?, ?, ?, ?)',
        after:  'insert into `table_name` (`created_at`, `name`, `team_id`, `s3_key`, `updated_at`) values (?, ?, ?, ?)'
      }, {
        before: 'update `tableName` set `email` = ?, `name` = ?, `updatedAt` = ? where `id` = ?',
        after:  'update `table_name` set `email` = ?, `name` = ?, `updated_at` = ? where `id` = ?'
      }];

      it('should convert an SQL string from snake_case to lowerCamelCase', function() {
        _.each(examples, function(example) {
          var result = camelize.toSnakeCase(example.before);
          expect(result).to.eql(example.after);
        })
      });
    });

    describe('toLowerCamelCase', function() {
      var examples = [{
        before: {name: 'test', s3_key: 'test', team_id: 'test'},
        after: {name: 'test', s3Key: 'test', teamId: 'test'}
      }, {
        before: [{name: 'test', s3_key: 'test', team_id: 'test'}],
        after: [{name: 'test', s3Key: 'test', teamId: 'test'}]
      }];

      it('should convert an SQL response from lowerCamelCase to snake_case', function() {
        _.each(examples, function(example) {
          var result = camelize.toLowerCamelCase(example.before);
          expect(result).to.eql(example.after);
        })
      });
    });

    it('should convert to snake_case and back', function(done) {
      var teamIds = _.pluck(players, 'teamId');
      Player.query().whereIn('teamId', teamIds).then(function(players) {
        var result = _.pluck(players, 'teamId');
        expect(result).to.eql(teamIds);
      }).then(done, done);
    });
  });

  describe('defer', function() {
    it('should run a deferred operation', function(done) {
      Team.query().defer(function(qb) {
        return Team.query().then(function(teams) {
          var ids = _.pluck(teams, 'id');
          var id = _.first(ids);
          qb.where('id', id);
        });
      }).limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 1']);
      }).then(done, done);
    });
  });

  describe('orderBy', function() {
    it('be ASC with no direction', function(done) {
      Team.query().orderBy('name').first().then(function(team) {
        expect(team.name).to.eql('Team 1')
      }).then(done, done);
    });

    it('be DESC with direction', function(done) {
      Team.query().orderBy('name', 'desc').first().then(function(team) {
        expect(team.name).to.eql('Team 5')
      }).then(done, done);
    });

    it('be DESC with -', function(done) {
      Team.query().orderBy('-name').first().then(function(team) {
        expect(team.name).to.eql('Team 5')
      }).then(done, done);
    });
  });

  describe('after', function() {
    it('should return the 1st 2 teams', function(done) {
      Team.query().after('name').limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 1', 'Team 2']);
      }).then(done, done);
    });

    it('should return the 2nd 2 teams', function(done) {
      Team.query().after('name').limit(2).then(function(result) {
        var last = _.last(result);
        return Team.query().after('name', last.name, last.id).limit(2);
      }).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 3', 'Team 4']);
      }).then(done, done);
    });

    it('should return the Last 2 teams', function(done) {
      Team.query().after('-name').limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 5', 'Team 4']);
      }).then(done, done);
    });

    it('should return the 2nd to Last 2 teams', function(done) {
      Team.query().after('-name', 4).limit(2).then(function(result) {
        var last = _.last(result);
        return Team.query().after('-name', last.name, last.id).limit(2);
      }).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 3', 'Team 2']);
      }).then(done, done);
    });
  });
});
