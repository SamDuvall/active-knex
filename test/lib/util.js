/* global describe it */
/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const knex = require('../knex')
const { arrayify } = require('../../index')

describe('util', () => {
  describe('arrayify', () => {
    it('convert everything to an array', () => {
      // Empty
      expect(arrayify()).to.eql([])
      expect(arrayify(undefined)).to.eql([])

      // Value
      expect(arrayify(null)).to.eql([null])
      expect(arrayify(0)).to.eql([0])
      expect(arrayify(1)).to.eql([1])
      expect(arrayify('test')).to.eql(['test'])

      // Array
      expect(arrayify([])).to.eql([])
      expect(arrayify([0, 'test'])).to.eql([0, 'test'])
      expect(arrayify([0, 1, 'test'])).to.eql([0, 1, 'test'])
    })
  })

  describe('toSqlSnakeCase', () => {
    const tests = [{
      qb: knex('tableName').orderBy('teamId', 'asc').limit(5),
      sql: 'select * from `table_name` order by `team_id` asc limit ?'
    }, {
      qb: knex('tableName').insert({ createdAt: null, name: null, s3Key: null, teamId: null, updatedAt: null }),
      sql: 'insert into `table_name` (`created_at`, `name`, `s3_key`, `team_id`, `updated_at`) values (?, ?, ?, ?, ?)'
    }, {
      qb: knex('tableName').update({ email: null, name: null, updatedAt: null }).where({id: 1}),
      sql: 'update `table_name` set `email` = ?, `name` = ?, `updated_at` = ? where `id` = ?'
    }]

    it('should convert an SQL string to snake_case from lowerCamelCase', () => {
      tests.forEach((test) => {
        const sql = test.qb.toSQL().sql
        expect(sql).to.eql(test.sql)
      })
    })
  })
})
