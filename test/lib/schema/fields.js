/* global describe it */
/* eslint-disable no-unused-expressions */
const {expect} = require('chai')
const fields = require('../../../lib/schema/fields')

describe('Schema Fields', () => {
  describe('known', () => {
    describe('boolean', () => {
      describe('fromDb', () => {
        it('should convert 0', () => {
          var value = fields.known.boolean.fromDb(0)
          expect(value).to.be.false
        })

        it('should convert 1', () => {
          var value = fields.known.boolean.fromDb(1)
          expect(value).to.be.true
        })
      })

      describe('toDb', () => {
        it('should convert false', () => {
          var value = fields.known.boolean.toDb(false)
          expect(value).to.be.false
        })

        it('should convert true', () => {
          var value = fields.known.boolean.toDb(true)
          expect(value).to.be.true
        })
      })
    })

    describe('csv', () => {
      describe('fromDb', () => {
        it('should convert null', () => {
          var fromDb = fields.known.csv.fromDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = fields.known.csv.fromDb('')
          expect(fromDb).to.eql([])
        })

        it('should convert csv', () => {
          var fromDb = fields.known.csv.fromDb('a,b,c')
          expect(fromDb).to.eql(['a', 'b', 'c'])
        })
      })

      describe('toDb', () => {
        it('should convert null', () => {
          var fromDb = fields.known.csv.toDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = fields.known.csv.toDb([])
          expect(fromDb).to.eql('')
        })

        it('should convert array', () => {
          var fromDb = fields.known.csv.toDb(['a', 'b', 'c'])
          expect(fromDb).to.eql('a,b,c')
        })
      })
    })

    describe('csvInteger', () => {
      describe('fromDb', () => {
        it('should convert null', () => {
          var fromDb = fields.known.csvInteger.fromDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = fields.known.csvInteger.fromDb('')
          expect(fromDb).to.eql([])
        })

        it('should convert csv', () => {
          var fromDb = fields.known.csvInteger.fromDb('1,2,3,sdgfsdfg')
          expect(fromDb).to.eql([1, 2, 3, NaN])
        })
      })

      describe('toDb', () => {
        it('should convert null', () => {
          var fromDb = fields.known.csvInteger.toDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = fields.known.csvInteger.toDb([])
          expect(fromDb).to.eql('')
        })

        it('should convert array', () => {
          var fromDb = fields.known.csvInteger.toDb([1, 2, 3])
          expect(fromDb).to.eql('1,2,3')
        })
      })
    })

    describe('json', () => {
      describe('fromDb', () => {
        it('should convert valid JSON', () => {
          var fromDb = fields.known.json.fromDb('{"foo":"bar"}')
          expect(fromDb).to.eql({foo: 'bar'})
        })
      })

      describe('toDb', () => {
        it('should convert object', () => {
          var toDb = fields.known.json.toDb({foo: 'bar'})
          expect(toDb).to.eql('{"foo":"bar"}')
        })
      })
    })
  })
})
