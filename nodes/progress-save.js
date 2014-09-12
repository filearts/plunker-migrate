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
    
    this.interval = setInterval(function () {
      if (self.updated_at) {
        Fs.writeFileSync(self.config.progressFile, self.updated_at);
        
        console.log("Progress saved", new Date(self.updated_at));
      }
    }, 1000);
    
    done();
  },
  process: function (msg, done) {
    this.updated_at = Math.max(this.updated_at, ( new Date(msg.updated_at)).valueOf());
    
    //this.output(msg._id, done);
    
    done();
  }
});