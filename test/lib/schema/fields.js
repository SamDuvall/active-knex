var _ = require('underscore');
var expect = require('chai').expect;
var fields = require('../../../lib/schema/fields');

describe('Schema Fields',function() {
  describe('known', function() {
    describe('boolean', function() {
      describe('fromDb', function() {
        it('should convert 0', function() {
          var value = fields.known.boolean.fromDb(0);
          expect(value).to.be.false;
        });

        it('should convert 1', function() {
          var value = fields.known.boolean.fromDb(1);
          expect(value).to.be.true;
        });
      });

      describe('toDb', function() {
        it('should convert false', function() {
          var value = fields.known.boolean.toDb(false);
          expect(value).to.be.false;
        });

        it('should convert true', function() {
          var value = fields.known.boolean.toDb(true);
          expect(value).to.be.true;
        });
      });
    });

    describe('csv', function() {
      describe('fromDb', function() {
        it('should convert null', function() {
          var fromDb = fields.known.csv.fromDb(null);
          expect(fromDb).to.eql(null);
        });

        it('should convert empty', function() {
          var fromDb = fields.known.csv.fromDb('');
          expect(fromDb).to.eql([]);
        });

        it('should convert csv', function() {
          var fromDb = fields.known.csv.fromDb('a,b,c');
          expect(fromDb).to.eql(['a','b','c']);
        });
      });

      describe('toDb', function() {
        it('should convert null', function() {
          var fromDb = fields.known.csv.toDb(null);
          expect(fromDb).to.eql(null);
        });

        it('should convert empty', function() {
          var fromDb = fields.known.csv.toDb([]);
          expect(fromDb).to.eql('');
        });

        it('should convert array', function() {
          var fromDb = fields.known.csv.toDb(['a','b','c']);
          expect(fromDb).to.eql('a,b,c');
        });
      });
    });

    describe('csvInteger', function() {
      describe('fromDb', function() {
        it('should convert null', function() {
          var fromDb = fields.known.csvInteger.fromDb(null);
          expect(fromDb).to.eql(null);
        });

        it('should convert empty', function() {
          var fromDb = fields.known.csvInteger.fromDb('');
          expect(fromDb).to.eql([]);
        });

        it('should convert csv', function() {
          var fromDb = fields.known.csvInteger.fromDb('1,2,3,sdgfsdfg');
          expect(fromDb).to.eql([1,2,3,NaN]);
        });
      });

      describe('toDb', function() {
        it('should convert null', function() {
          var fromDb = fields.known.csvInteger.toDb(null);
          expect(fromDb).to.eql(null);
        });

        it('should convert empty', function() {
          var fromDb = fields.known.csvInteger.toDb([]);
          expect(fromDb).to.eql('');
        });

        it('should convert array', function() {
          var fromDb = fields.known.csvInteger.toDb([1,2,3]);
          expect(fromDb).to.eql('1,2,3');
        });
      });
    });

    describe('json', function() {
      describe('fromDb', function() {
        it('should convert valid JSON', function() {
          var fromDb = fields.known.json.fromDb('{"foo":"bar"}');
          expect(fromDb).to.eql({foo: 'bar'});
        });
      });

      describe('toDb', function() {
        it('should convert object', function() {
          var toDb = fields.known.json.toDb({foo: 'bar'});
          expect(toDb).to.eql('{"foo":"bar"}');
        });
      });
    });
  });
});
