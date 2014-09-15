var Bloom = require("bloomfilter");
var Level = require("level-hyper");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  initialize: function (opts, done) {
    this.config = _.defaults({}, opts.config, {
      leveldb: "./objects",
    });
    
    this.seen = {};
    this.level = new Level(this.config.leveldb);
    
    done();
  },
  
  process: function (msg, done) {
    var self = this;
    
    if (this.seen[msg.sha]) return done();
    
    this.level.put(msg.sha, msg.buffer);
    // , function (err) {
    //   if (err) {
    //     console.error("[ERR] Error saving object", msg);
    //     console.trace(err);
        
    //     done(err);
    //   }
      
      self.seen[msg.sha] = true;
      
      done();
    // });
  }
});