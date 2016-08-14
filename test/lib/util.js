// TODO: arrayify
// TODO: toSnakeCase
// TODO: toLowerCamelCare

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
});
