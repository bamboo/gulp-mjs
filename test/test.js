var mjs = require('../');
var gutil = require('gulp-util');
var path = require('path');
var Meta = require('meta-script')();
require('should');
require('mocha');

var createFile = function (filepath, contents) {
  var base = path.dirname(filepath);
  return new gutil.File({
    path: filepath,
    base: base,
    cwd: path.dirname(base),
    contents: contents
  });
}

var compile = function (metascript) {
  return Meta.compilerFromString(metascript).compile();
}

describe('mjs', function() {
  it('should compile a single metascript file', function(done) {
    var code = "console.log 'Hello, Metascript!'";
    var file = createFile('/src/path/file.mjs', new Buffer(code));
    mjs()
      .on('error', done)
      .on('data', function (data) {
          data.path.should.equal('/src/path/file.js');
          data.contents.toString().should.equal(compile(code));
          done();
      })
      .write(file);
  });
});
