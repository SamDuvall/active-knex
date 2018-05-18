/* global describe it */
/* eslint-disable no-unused-expressions */
const {expect} = require('chai')
const { FIELD_TYPES } = require('../../src/fields')

describe('Schema Fields', () => {
  describe('known', () => {
    describe('boolean', () => {
      describe('fromDb', () => {
        it('should convert 0', () => {
          var value = FIELD_TYPES.boolean.fromDb(0)
          expect(value).to.be.false
        })

        it('should convert 1', () => {
          var value = FIELD_TYPES.boolean.fromDb(1)
          expect(value).to.be.true
        })
      })

      describe('toDb', () => {
        it('should convert false', () => {
          var value = FIELD_TYPES.boolean.toDb(false)
          expect(value).to.be.false
        })

        it('should convert true', () => {
          var value = FIELD_TYPES.boolean.toDb(true)
          expect(value).to.be.true
        })
      })
    })

    describe('csv', () => {
      describe('fromDb', () => {
        it('should convert null', () => {
          var fromDb = FIELD_TYPES.csv.fromDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = FIELD_TYPES.csv.fromDb('')
          expect(fromDb).to.eql([])
        })

        it('should convert csv', () => {
          var fromDb = FIELD_TYPES.csv.fromDb('a,b,c')
          expect(fromDb).to.eql(['a', 'b', 'c'])
        })
      })

      describe('toDb', () => {
        it('should convert null', () => {
          var fromDb = FIELD_TYPES.csv.toDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = FIELD_TYPES.csv.toDb([])
          expect(fromDb).to.eql('')
        })

        it('should convert array', () => {
          var fromDb = FIELD_TYPES.csv.toDb(['a', 'b', 'c'])
          expect(fromDb).to.eql('a,b,c')
        })
      })
    })

    describe('csvInteger', () => {
      describe('fromDb', () => {
        it('should convert null', () => {
          var fromDb = FIELD_TYPES.csvInteger.fromDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = FIELD_TYPES.csvInteger.fromDb('')
          expect(fromDb).to.eql([])
        })

        it('should convert csv', () => {
          var fromDb = FIELD_TYPES.csvInteger.fromDb('1,2,3,sdgfsdfg')
          expect(fromDb).to.eql([1, 2, 3, NaN])
        })
      })

      describe('toDb', () => {
        it('should convert null', () => {
          var fromDb = FIELD_TYPES.csvInteger.toDb(null)
          expect(fromDb).to.eql(null)
        })

        it('should convert empty', () => {
          var fromDb = FIELD_TYPES.csvInteger.toDb([])
          expect(fromDb).to.eql('')
        })

        it('should convert array', () => {
          var fromDb = FIELD_TYPES.csvInteger.toDb([1, 2, 3])
          expect(fromDb).to.eql('1,2,3')
        })
      })
    })

    describe('json', () => {
      describe('fromDb', () => {
        it('should convert valid JSON', () => {
          var fromDb = FIELD_TYPES.json.fromDb('{"foo":"bar"}')
          expect(fromDb).to.eql({foo: 'bar'})
        })
      })

      describe('toDb', () => {
        it('should convert object', () => {
          var toDb = FIELD_TYPES.json.toDb({foo: 'bar'})
          expect(toDb).to.eql('{"foo":"bar"}')
        })
      })
    })
  })
})
