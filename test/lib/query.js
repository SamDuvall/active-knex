var _ = require('underscore');
var expect = require('chai').expect;
var Factory = require('../factory');
var Team = require('../examples/team');

describe('Query',function() {
  var teams;
  beforeEachSync(function() {
    teams = _.times(5, function(index) {
      return Factory.create('team', {name: 'Team ' + (index + 1)});
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

  describe('after', function() {
    it('should return the 1st 2 teams', function(done) {
      Team.query().after('name').limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 1', 'Team 2']);
      }).then(done, done);
    });

    it('should return the 2nd 2 teams', function(done) {
      Team.query().after('teams.name', 2).limit(2).then(function(result) {
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
      Team.query().after('-teams.name', 4).limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 3', 'Team 2']);
      }).then(done, done);
    });
  });
});
