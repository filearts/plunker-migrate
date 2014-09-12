var Fs = require("fs");
var Straw = require("straw");

var progressFile = __dirname + "/progress.txt";

var last_updated_at = Fs.existsSync(progressFile) ? (new Date(Fs.readFileSync(progressFile, "utf8"))).valueOf() : 0;

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
  // output: "plunk-id",
  config: {
    progressFile: progressFile,
  },
}], function () {
  console.log("Starting topology");
  
  topo.start({purge: true});
});

// var plunks = Straw.tap({
//   input: "plunk-id",
//   redis: redis,
// });

// plunks.on("message", function (id) {
//   console.log("Plunk", id);
// });