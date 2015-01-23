var config = require('../knexfile').test;
module.exports = require('knex')(config);
