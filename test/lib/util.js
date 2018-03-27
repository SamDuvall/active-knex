// TODO: arrayify
var _ = require('underscore');
var expect = require('chai').expect;
var ActiveKnex = require('../../index');

describe('util', () => {
  describe('arrayify', () => {
    var arrayify = ActiveKnex.util.arrayify;
    it('convert everything to an array', () => {
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

  describe('toSqlSnakeCase', () => {
    var toSqlSnakeCase = ActiveKnex.util.toSqlSnakeCase;

    var examples = [{
      before: 'select * from `tableName` order by `teamId` asc limit ?',
      after:  'select * from `table_name` order by `team_id` asc limit ?'
    }, {
      before: 'insert into `tableName` (`createdAt`, `name`, `teamId`, `s3Key`, `updatedAt`) values (?, ?, ?, ?)',
      after:  'insert into `table_name` (`created_at`, `name`, `team_id`, `s3_key`, `updated_at`) values (?, ?, ?, ?)'
    }, {
      before: 'update `tableName` set `email` = ?, `name` = ?, `updatedAt` = ? where `id` = ?',
      after:  'update `table_name` set `email` = ?, `name` = ?, `updated_at` = ? where `id` = ?'
    }, {
      before: 'SELECT id, JSON_EXTRACT(handbooks.prevBranding, "$.handbookCss") FROM handbooks WHERE JSON_EXTRACT(handbooks.prevBranding, "$.handbookCss") IS NOT NULL',
      after: 'SELECT id, JSON_EXTRACT(handbooks.prev_branding, "$.handbookCss") FROM handbooks WHERE JSON_EXTRACT(handbooks.prev_branding, "$.handbookCss") IS NOT NULL'
    }];

    it('should convert an SQL string to snake_case from lowerCamelCase', () => {
      _.each(examples, function(example) {
        var result = toSqlSnakeCase(example.before);
        expect(result).to.eql(example.after);
      })
    });
  });

  describe('toLowerCamelCase', () => {
    var toLowerCamelCase = ActiveKnex.util.toLowerCamelCase;

    var examples = [{
      before: {name: 'test', s3_key: 'test', team_id: 'test'},
      after: {name: 'test', s3Key: 'test', teamId: 'test'}
    }, {
      before: [{name: 'test', s3_key: 'test', team_id: 'test'}],
      after: [{name: 'test', s3Key: 'test', teamId: 'test'}]
    }];

    it('should convert an SQL response to lowerCamelCase from snake_case', () => {
      _.each(examples, function(example) {
        var result = toLowerCamelCase(example.before);
        expect(result).to.eql(example.after);
      })
    });
  });
});
