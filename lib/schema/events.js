var Promise = require('bluebird');
var _ = require('underscore');

var Events = function() {
  this.events = {};
}

_.extend(Events.prototype, {
  on: function(event, callback) {
    this.events[event] = this.events[event] || [];
    this.events[event].push(callback);
  },

  trigger: function(event, data, trx) {
    var events = this.events[event] || [];
    return Promise.map(events, function(callback) {
      return callback(data, trx);
    }).return(data);
  },

  triggerBeforeAndAfter: function(event, input, trx, operation) {
    var events = this;
    function before(data) { return events.trigger('before:' + event, data, trx); }
    function after(data) { return events.trigger('after:' + event, data, trx); }
    return Promise.reduce([before, operation, after], function(data, perform) {
      return perform(data);
    }, input);
  }
});

module.exports = Events;
