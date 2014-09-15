var Fs = require("fs");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  updated_at: 0,
  initialize: function (opts, done) {
    var self = this;
    
    this.config = _.defaults({}, opts.config, {
      progressFile: "./progress.txt",
    });
    
    done();
  },
  start: function (done) {
    this.interval = setInterval(this.tick.bind(this), 10000);
    
    done();
  },
  stop: function (done) {
    clearInterval(this.interval);
  },
  tick: function () {
    if (this.updated_at) {
      Fs.writeFileSync(this.config.progressFile, this.updated_at);
    }
  },
  
  process: function (msg, done) {
    this.updated_at = Math.max(this.updated_at, ( new Date(msg.updated_at)).valueOf());
    
    this.output(msg.updated_at, done);
    
  }
});