var _ = require('underscore');
var expect = require('chai').expect;
var camelize = require('../../lib/query/camelize');
var Factory = require('../factory');
var Player = require('../examples/player');
var Team = require('../examples/team');
var knex = require('../knex');

describe('Query',function() {
  var teams;
  var players;
  beforeEachSync(function() {
    teams = _.times(5, function(index) {
      return Factory.create('team', {
        name: 'Team ' + (index + 1)
      });
    });

    players = _.map(teams, function(team) {
      return Factory.create('player', {
        teamId: team.id,
        stats: {
          positions: ['1B', 'SS', '3B']
        }
      });
    });
  });

  describe('camelize', function() {
    it('should convert to snake_case and back', function() {
      var teamIds = _.pluck(players, 'teamId');
      return Player.query().whereIn('teamId', teamIds).then(function(players) {
        var result = _.pluck(players, 'teamId');
        expect(result).to.eql(teamIds);
      });
    });
  });

  describe('defer', function() {
    it('should run a deferred operation', function() {
      return Team.query().defer(function(qb) {
        return Team.query().then(function(teams) {
          var ids = _.pluck(teams, 'id');
          var id = _.first(ids);
          qb.where('id', id);
        });
      }).limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 1']);
      });
    });
  });

  describe('orderBy', function() {
    describe('single column', function() {
      it('be ASC with no direction', function() {
        return Team.query().orderBy('name').first().then(function(team) {
          expect(team.name).to.eql('Team 1');
        })
      });

      it('be DESC with direction', function() {
        return Team.query().orderBy('name', 'desc').first().then(function(team) {
          expect(team.name).to.eql('Team 5');
        })
      });

      it('be DESC with -', function() {
        return Team.query().orderBy('-name').first().then(function(team) {
          expect(team.name).to.eql('Team 5');
        })
      });
    });

    describe('multiple columns', function() {
      beforeEachSync(function() {
        _.times(5, function(index) {
          return Factory.create('team', {name: 'Team ' + (index + 1), archived: true});
        });
      });

      it('be ASC/ASC', function() {
        return Team.query().orderBy(['name', 'archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 1');
          expect(team.archived).to.be.false;
        })
      });

      it('be ASC/DESC', function() {
        return Team.query().orderBy(['name', '-archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 1');
          expect(team.archived).to.be.true;
        })
      });

      it('be DESC/ASC', function() {
        return Team.query().orderBy(['-name', 'archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 5');
          expect(team.archived).to.be.false;
        })
      });

      it('be DESC/DESC', function() {
        return Team.query().orderBy(['-name', '-archived']).first().then(function(team) {
          expect(team.name).to.eql('Team 5');
          expect(team.archived).to.be.true;
        })
      });
    });

    describe('custom ordering', function() {
      beforeEachSync(function() {
        _.times(5, function(index) {
          return Factory.create('team', {name: 'Team ' + (index + 1), archived: true});
        });
      });

      it('be ASC', function() {
        return Team.query().orderBy('custom').first().then(function(team) {
          expect(team.name).to.eql('Team 1');
          expect(team.archived).to.be.false;
        })
      });

      it('be DESC', function() {
        return Team.query().orderBy('-custom').first().then(function(team) {
          expect(team.name).to.eql('Team 5');
          expect(team.archived).to.be.true;
        })
      });
    });
  });

  describe('after', function() {
    describe('no nulls', function() {
      it('should return the 1st 2 teams', function() {
        return Team.query().after('name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 1', 'Team 2']);
        })
      });

      it('should return the 2nd 2 teams', function() {
        return Team.query().after('name').limit(2).then(function(result) {
          var last = _.last(result);
          return Team.query().after('name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 3', 'Team 4']);
        })
      });

      it('should return the Last 2 teams', function() {
        return Team.query().after('-name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 5', 'Team 4']);
        })
      });

      it('should return the 2nd to Last 2 teams', function() {
        return Team.query().after('-name', 4).limit(2).then(function(result) {
          var last = _.last(result);
          return Team.query().after('-name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 3', 'Team 2']);
        })
      });
    });

    describe('with nulls', function() {
      beforeEachSync(function() {
        var moreTeams = _.times(3, function(index) {
          return Factory.create('team', {name: null});
        });
        teams = _.union(teams, moreTeams);
      });

      it('should return the 1st 2 teams', function() {
        return Team.query().after('name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql([null, null]);
        })
      });

      it('should return the 2nd 2 teams', function() {
        return Team.query().after('name').limit(2).then(function(result) {
          var last = _.last(result);
          return Team.query().after('name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql([null, 'Team 1']);
        })
      });

      it('should return the 3rd 2 teams', function() {
        return Team.query().after('name').limit(4).then(function(result) {
          var last = _.last(result);
          return Team.query().after('name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 2', 'Team 3']);
        })
      });

      it('should return the Last 2 teams', function() {
        return Team.query().after('-name').limit(2).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 5', 'Team 4']);
        })
      });

      it('should return the 2nd to Last 2 teams', function() {
        return Team.query().after('-name', 4).limit(2).then(function(result) {
          var last = _.last(result);
          return Team.query().after('-name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 3', 'Team 2']);
        })
      });

      it('should return the 3rd to Last 2 teams', function() {
        return Team.query().after('-name', 4).limit(4).then(function(result) {
          var last = _.last(result);
          return Team.query().after('-name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql(['Team 1', null]);
        })
      });

      it('should return the 4th to Last 2 teams', function() {
        return Team.query().after('-name', 4).limit(6).then(function(result) {
          var last = _.last(result);
          return Team.query().after('-name', last.name, last.id).limit(2);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          expect(names).to.eql([null, null]);
        })
      });
    });

    describe('multiple columns', function() {
      var columns = ['name', '-archived'];

      beforeEachSync(function() {
        var moreTeams = _.times(5, function(index) {
          return Factory.create('team', {name: 'Team ' + (index + 1), archived: true});
        });
        teams = _.union(teams, moreTeams);
      });

      it('should return the 1st 3 teams', function() {
        return Team.query().after(columns).limit(3).then(function(result) {
          var names = _.pluck(result, 'name');
          var archiveds = _.pluck(result, 'archived');
          expect(names).to.eql(['Team 1', 'Team 1', 'Team 2']);
          expect(archiveds).to.eql([true, false, true]);
        })
      });

      it('should return the 2nd 3 teams', function() {
        return Team.query().after(columns).limit(3).then(function(result) {
          var last = _.last(result);
          var lastValues = [last.name, last.archived];
          return Team.query().after(columns, lastValues, last.id).limit(3);
        }).then(function(result) {
          var names = _.pluck(result, 'name');
          var archiveds = _.pluck(result, 'archived');
          expect(names).to.eql(['Team 2', 'Team 3', 'Team 3']);
          expect(archiveds).to.eql([false, true, false]);
        })
      });
    });
  });

  describe('afterId', function() {
    it('should return the 1st 2 teams', function() {
      return Team.query().afterId('name').limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 1', 'Team 2']);
      })
    });

    it('should return 2 teams after', function() {
      var team = teams[2];
      return Team.query().afterId('name', team.id).limit(2).then(function(result) {
        var names = _.pluck(result, 'name');
        expect(names).to.eql(['Team 4', 'Team 5']);
      })
    });
  });

  describe('update', function() {
    it('should update using raw values', function() {
      var player = _.first(players);
      return Player.query().where('id', player.id).update({
        stats: knex.raw('JSON_REMOVE(stats, ?)', '$.positions[1]')
      }).then(function() {
        return Player.findById(player.id);
      }).then(function(result) {
        expect(result.stats.positions).to.eql(['1B','3B']);
      });
    });
  });
});
