var Mongo = require("mongo-gyro");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  initialize: function (opts, done) {
    this.config = _.defaults({}, opts.config, {
      mongoUrl: "mongodb://localhost:27018",
    });
    
    this.processed = 0;
    this.mongo = new Mongo(this.config.mongoUrl);
    
    this.mongo.collection("plunks")
      .then(function () {
        done();
      });
  },
  start: function (done) {
    var self = this;
    var query = {};
    
    if (this.config.last_updated_at) {
      query.updated_at = {
        $gte: new Date(this.config.last_updated_at)
      };
    }
    
    // return done();
    
    console.log("QUERY", query);

    this.mongo.findCursor("plunks", query, { sort: { updated_at: 1 } })
      .then(function (cursor) {
        cursor.countAsync()
          .then(function (count) {
            //cursor.batchSize(10);
            
            console.log("Streaming ", count, "plunks");

            self.count = count;
            self.stream = cursor.stream();
            
            self.stream.on("data", function (plunk) {
              self.processed++;
              self.output("plunk-old", plunk);
              self.output("progress", { processed: self.processed, count: self.count });
            });
            
            self.stream.on("error", function (err) {
              console.log("[ERR]", err.message);
              console.trace(err);
            });
            
            self.stream.on("end", function () {
              console.log("End of plunk stream");
            });
            
            done();
          });
      }, function (err) {
        console.log("[ERR]", err.message);
        console.trace(err);
        
        done(err);
      });
  }
});