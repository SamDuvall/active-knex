// TODO: arrayify
var _ = require('underscore');
var expect = require('chai').expect;
var ActiveKnex = require('../../index');

describe('util',function() {
  describe('arrayify',function() {
    var arrayify = ActiveKnex.util.arrayify;
    it('convert everything to an array', function() {
      // Empty
      expect(arrayify()).to.eql([]);
      expect(arrayify(undefined)).to.eql([]);

      // Value
      expect(arrayify(null)).to.eql([null]);
      expect(arrayify(0)).to.eql([0]);
      expect(arrayify(1)).to.eql([1]);
      expect(arrayify('test')).to.eql(['test']);

      // Array
      expect(arrayify([])).to.eql([]);
      expect(arrayify([0, 'test'])).to.eql([0, 'test']);
      expect(arrayify([0, 1, 'test'])).to.eql([0, 1, 'test']);
    });
  });

  describe('toSnakeCase', function() {
    var toSnakeCase = ActiveKnex.util.toSnakeCase;

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
        var result = toSnakeCase(example.before);
        expect(result).to.eql(example.after);
      })
    });
  });

  describe('toLowerCamelCase', function() {
    var toLowerCamelCase = ActiveKnex.util.toLowerCamelCase;

    var examples = [{
      before: {name: 'test', s3_key: 'test', team_id: 'test'},
      after: {name: 'test', s3Key: 'test', teamId: 'test'}
    }, {
      before: [{name: 'test', s3_key: 'test', team_id: 'test'}],
      after: [{name: 'test', s3Key: 'test', teamId: 'test'}]
    }];

    it('should convert an SQL response from lowerCamelCase to snake_case', function() {
      _.each(examples, function(example) {
        var result = toLowerCamelCase(example.before);
        expect(result).to.eql(example.after);
      })
    });
  });
});
