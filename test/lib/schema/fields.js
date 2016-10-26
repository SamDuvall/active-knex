var _ = require('underscore');
var expect = require('chai').expect;
var fields = require('../../../lib/schema/fields');

describe('Schema Fields',function() {
  describe('known', function() {
    describe('boolean', function() {
      it('should convert from DB', function() {
        var fromDb = fields.known.boolean.fromDb(0);
        expect(fromDb).to.be.false;

        var fromDb = fields.known.boolean.fromDb(1);
        expect(fromDb).to.be.true;
      });

      it('should convert to DB', function() {
        var toDb = fields.known.boolean.toDb(false);
        expect(toDb).to.be.false;

        var toDb = fields.known.boolean.fromDb(true);
        expect(toDb).to.be.true;
      });
    });

    describe('csv', function() {
      it('should convert from DB', function() {
        var fromDb = fields.known.csv.fromDb('a,b,c');
        expect(fromDb).to.eql(['a','b','c']);
      });

      it('should convert to DB', function() {
        var toDb = fields.known.csv.toDb(['a','b','c']);
        expect(toDb).to.eql('a,b,c');
      });
    });

    describe('csvInt', function() {
      it('should convert from DB', function() {
        var fromDb = fields.known.csvInteger.fromDb('1,2,3');
        expect(fromDb).to.eql([1,2,3]);
      });

      it('should convert to DB', function() {
        var toDb = fields.known.csvInteger.toDb([1,2,3]);
        expect(toDb).to.eql('1,2,3');
      });
    });

    describe('json', function() {
      it('should convert from DB', function() {
        var fromDb = fields.known.json.fromDb('{"foo":"bar"}');
        expect(fromDb).to.eql({foo: 'bar'});
      });

      it('should convert to DB', function() {
        var toDb = fields.known.json.toDb({foo: 'bar'});
        expect(toDb).to.eql('{"foo":"bar"}');
      });
    });
  });
});
