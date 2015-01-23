var Fiber = require('fibers');

global.beforeSync = function(callback) {
  before(function(done) {
    Fiber(function() {
      callback();
      done();
    }).run();
  });
}

global.beforeEachSync = function(callback) {
  beforeEach(function(done) {
    Fiber(function() {
      callback();
      done();
    }).run();
  });
}
