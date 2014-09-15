var Humanize = require("humanize-plus");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  start: function (done) {
    this.start_at = Date.now();
    this.processed = 0;
    this.last_date = 0;
    
    this.interval = setInterval(this.update.bind(this), 10000);
    
    done();
  },
  stop: function (done) {
    clearInterval(this.interval);
    
    done();
  },
  process: function (msg, done) {
    var self = this;
    
    this.processed++;
    this.last_date = msg;
    
    done();
  },
  update: function () {
    var now = Date.now();
    var rate = this.processed / ((now - this.start_at) / 1000);
    
    console.log("Processed\t", Humanize.compactInteger(this.processed, 3), "\t", Humanize.formatNumber(rate, 2) + "/s", new Date(this.last_date).toISOString());
  }
});