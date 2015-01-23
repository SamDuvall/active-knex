# ActiveKnex

Bringing the awesomeness of knex one step closer to ActiveRecord!

NOTE: While I think Bookshelf is a great project, it has the same annoyances that Backbone has where it puts a whole bunch of stuff that I don't want in and around my data. I want a raw Javascript Object!

## Using ActiveKnex

var ActiveKnex = require('active-knex');
var knex = require('knex')(knexConfig);

// Create your very own Schema right on top of your existing knex object
var MySchema = ActiveKnex.Schema.create(knex, {
  tableName: 'table_name',
  // Everything else!
  });

  ## Relations

  Want to load associations into your data object before you res.json? This is for you!

  ### Define a Relation in your Schema

  var Player = ActiveKnex.Schema.create(knex, {
    tableName: 'players',

    relations: {
      players: function() {
        var Player = require('./player');
        return ActiveKnex.Relation.HasMany({
          model: Player,
          foreignKey: 'team_id'
          });
        }
      }
      });

      ###Load association data right into your Object

      var team = {id: 1};
      Team.load(team, 'players').then(function(team) {
        team.players; // Array of players
        });

        ##Testing

        To run the tests

        npm install
        mocha

        ## More Documentation To Come!
