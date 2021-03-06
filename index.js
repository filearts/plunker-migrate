var Fs = require("fs");
var Straw = require("straw");

var progressFile = __dirname + "/progress.txt";

var last_updated_at = Fs.existsSync(progressFile) ? parseInt(Fs.readFileSync(progressFile, "utf8"), 10) : 0;

var redis = {
  host: 'localhost',
  port: 6379,
};

var topo = Straw.create({
  nodes_dir: __dirname + '/nodes',
  redis: redis,
});

topo.add([{
  id: "pull-plunks",
  node: "pull-plunks",
  outputs: {
    'plunk-old': "plunk-old",
  },
  config: {
    last_updated_at: last_updated_at,
    mongoUrl: process.env.MONGO_URL,
  },
}, {
  id: "plunk-parse",
  node: "plunk-parse",
  input: "plunk-old",
  outputs: {
    'object': "object",
    'package-usage': "package-usage",
    'plunk-new': "plunk-new",
  },
}, {
  id: "plunk-index",
  node: "plunk-index",
  input: "plunk-new",
  output: "plunk-indexed",
  config: {
    index: "plunker",
    type: "plunk",
  },
}, {
  id: "object-save",
  node: "object-save",
  input: "object",
  config: {
    leveldb: __dirname + "/objects",
  },
}, {
  id: "progress-save",
  node: "progress-save",
  input: "plunk-indexed",
  output: "plunk-id",
  config: {
    progressFile: progressFile,
  },
}, {
  id: "track-speed",
  node: "track-speed",
  input: "plunk-id",
}], function () {
  console.log("Starting topology");
  
  topo.start();
});

process.on( 'SIGINT', function() {
  topo.destroy(function(){
    console.log( 'Finished.' );
  });
});