var Diff = require("googlediff");
var Git = require("../lib/git");
var Pad = require("padded-semver");
var Semver = require("semver")
var Straw = require("straw");
var _ = require("lodash");

module.exports = Straw.node({
  initialize: function (opts, done) {
    this.config = _.defaults({}, opts.config, {
    });
    
    this.diff = new Diff();
    
    done();
  },
  parseVersions: function (oldPlunk) {
    var self = this;
    var dmp = this.diff;
    var files = {};
    var lastCommit = null;
    var version = 0;
    
    _.forEach(oldPlunk.files, function (file) {
      files[file.filename] = file;
    });
    
    dmp.Match_Threshold = 0;
    dmp.Match_Distance = 0;
    dmp.Patch_DeleteThreshold = 0;
    
    if (!oldPlunk.history || !oldPlunk.history.length) {
      var tree = Git.fromFiles(toFilesArray());
      var commit = Git.createCommit(tree, "Initial commit", oldPlunk.user, []);
      
      saveCommit(commit);
    } else {
      _.forEachRight(oldPlunk.history, parseRevision);
    }
    
    return {
      commit: lastCommit,
      version: version,
    };
    
    
    
    function saveCommit (commit) {
      _.forEach(commit.getObjects(), function (buffer, sha) {
        self.output("object", { sha: sha, buffer: buffer });
      });
      
      lastCommit = commit;
      version++;
    }
    
    function parseRevision (revision) {
        var message = version === 0 ? "Initial commit" : "Revision " + version;
        var tree = Git.fromFiles(toFilesArray());
        
        if (!lastCommit || tree.sha !== lastCommit.tree.sha) {
          
          var commit = Git.createCommit(tree, message, oldPlunk.user, lastCommit ? [lastCommit.sha] : []);
          
          saveCommit(commit);
        }
        
        // Initial revision has no changes
        _.forEach(revision.changes, function (chg) {
          if (chg.pn) {
            if (chg.fn) {
              if (chg.pl) {
                patch(chg.fn, dmp.patch_fromText(chg.pl));
              }
              if (chg.pn !== chg.fn) {
                rename(chg.fn, chg.pn);
              }
            } else {
              files[chg.pn] = {
                filename: chg.pn,
                content: chg.pl
              };
            }
          } else if (chg.fn) {
            remove(chg.fn);
          }
        });
      }
  
    function toFilesArray () {
      return _.map(files, function (file) {
        return {
          type: "file",
          path: "/" + file.filename,
          content: file.content,
        };
      });
    }
    
    function rename (fn, to) {
      var file = files[fn];
      if (file) {
        file.filename = to;
        delete files[fn];
        files[to] = file;
      }
    }
    
    function patch (fn, patches) {
      var file = files[fn];
      if (file) {
        file.content = dmp.patch_apply(patches, file.content)[0];
      }
    }
    
    function remove (fn) {
      delete files[fn];
    }
  },
  parsePackages: function (tree) {
    var self = this;
    var isHtmlRx = /\.html?$/i;
    var pkgRefRx = /<(?:script|link) [^>]*?data-(semver|require)="([^"]*)"(?: [^>]*?data-(semver|require)="([^"]*)")?/g;
    var refs = {};
    
    Git.walk(tree, function (entry, name) {
      var match;
      
      if (!isHtmlRx.test(name)) return;
      
      while ((match = pkgRefRx.exec(entry.content))) {
        var pkg = {};
        
        pkg[match[1]] = match[2];
        if (match[3]) pkg[match[3]] = match[4];
        
        if (pkg.require) {
          var parts = pkg.require.split("@");
          
          delete pkg.require;
          
          if (!pkg.semver) continue;
          
          pkg.semver = Semver.valid(pkg.semver);
          pkg.name = parts.shift();
          pkg.semverRange = parts.join("@") || "*";
      
          if (pkg.semver) {
            pkg.semver = Pad.pad(pkg.semver);
          
            refs[pkg.name] = pkg;
          }
        }
      }
    });
    
    // _.forEach(refs, function (pkg) {
    //   self.output("package-usage", pkg);
    // });

    return _.values(refs);
  },
  process: function (oldPlunk, done) {
    var currentVersion = this.parseVersions(oldPlunk);
    var packages = this.parsePackages(currentVersion.commit.tree);
    
    if (oldPlunk.fork_of && oldPlunk.fork_of.length > 32) {
      try {
        oldPlunk.fork_of = JSON.parse(oldPlunk.fork_of)._id;
      } catch (e) {
        console.log("[ERR] Failed parsing of old fork_of");
      }
    }
  
    // Define the plunk
    var plunk = {
      _id: oldPlunk._id,
      fork_of: oldPlunk.fork_of || null,
      title: oldPlunk.description,
      readme: "",
      tags: _.unique(oldPlunk.tags),
      created_at: oldPlunk.created_at,
      updated_at: oldPlunk.updated_at,
      viewed_at: oldPlunk.updated_at,
      deleted_at: null,
      user_id: oldPlunk.user || null,
      session_id: null,
      packages: packages,
      commit_sha: currentVersion.commit.sha,
      tree_sha: currentVersion.commit.tree.sha,
      forks_count: (oldPlunk.forks || []).length,
      revisions_count: currentVersion.version,
      comments_count: 0,
      views_count: parseInt(oldPlunk.views || 0, 10),
      likes_count: parseInt(oldPlunk.thumbs || 0, 10),
      favorites_count: 0,
      collections: [],
      queued: [],
    };
    
    Git.walk(currentVersion.commit.tree, function (entry, name) {
      if (name.match(/readme(.md|markdown)?$/)) {
        plunk.readme = entry.content;
        
        return false;
      }
    });
    
    if (!oldPlunk.private) {
      plunk.collections.push("plunker/public");
    }
    
    this.output("plunk-new", plunk, done);
  }
});
