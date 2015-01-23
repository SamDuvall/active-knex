var _ = require('underscore');
var Future = require('fibers/future');

// Wait for the promise to resolve
global.waitFor = function(promise) {
  var future = new Future;
  promise.then(function(result) {
    future.return(result);
  });
  return future.wait();
};
