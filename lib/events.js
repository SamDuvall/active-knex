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

  trigger: function(event, data) {
    var events = this.events[event] || [];
    return Promise.map(events, function(callback) {
      return callback(data);
    }).return(data);
  },

  triggerBeforeAndAfter: function(event, input, operation) {
    var events = this;
    function before(data) { return events.trigger('before:' + event, data); }
    function after(data) { return events.trigger('after:' + event, data); }
    return Promise.reduce([before, operation, after], function(data, perform) {
      return perform(data).then(function() {
        return data;
      })
    }, input);
  }
});

module.exports = Events;
