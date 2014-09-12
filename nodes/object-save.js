var Bloom = require("bloomfilter");
var Level = require("level-hyper");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  initialize: function (opts, done) {
    this.config = _.defaults({}, opts.config, {
      leveldb: "./objects",
    });
    
    this.bloom = new Bloom.BloomFilter(1024 * 1024, 32);
    this.level = new Level(this.config.leveldb);
    
    done();
  },
  process: function (msg, done) {
    var self = this;
    
    if (this.bloom.test(msg.sha)) return done();
    
    this.level.put(msg.sha, msg.buffer, function (err) {
      if (err) {
        console.error("[ERR] Error saving object", msg);
        console.trace(err);
        
        done(err);
      }
      
      self.bloom.add(msg.sha);
      
      done();
    });
  }
});