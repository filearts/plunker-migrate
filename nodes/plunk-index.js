var Elasticsearch = require("elasticsearch");
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  initialize: function (opts, done) {
    this.config = _.defaults({}, opts.config, {
      host: "http://localhost:9200",
    });
    
    this.es = new Elasticsearch.Client(this.config);
    
    done();
  },
  process: function (msg, done) {
    var self = this;
    
    this.es.index({index: this.config.index, type: this.config.type, id: msg._id, body: msg})
      .then(function () {
        self.output(msg, done);
        done();
      }, function (err) {
        console.error("[ERR] Indexing error", err.message);
        console.trace(err);
        
        done(err);
      });
  }
});