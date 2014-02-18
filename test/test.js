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
};

var compile = function (metascript) {
  return Meta.compilerFromString(metascript).compile();
};

describe('mjs single file compilation', function() {

  var code = "console.log 'Hello, Metascript!'";
  var file = createFile('/src/path/file.mjs', new Buffer(code));
  var expectedJsFilePath = '/src/path/file.js';

  function assertJsFile(jsFile) {
    jsFile.path.should.equal(expectedJsFilePath);
    jsFile.contents.toString().should.equal(compile(code));
  }

  it('should emit single js file by default', function() {
    var resultingFiles = [];
    var stream = mjs()
      .on('data', function (data) {
         resultingFiles.push(data);
      })
      .on('end', function () {
         assertJsFile(resultingFiles[0]);
         resultingFiles.length.should.equal(1);
      });
    stream.write(file);
    stream.end();
  });

  it('should emit js file and source map when debug is true', function() {
    var resultingFiles = [];
    var stream = mjs({debug: true})
      .on('data', function (data) {
         resultingFiles.push(data);
      })
      .on('end', function () {
         assertJsFile(resultingFiles[0]);
         resultingFiles.length.should.equal(2);
         var smFile = resultingFiles[1];
         smFile.path.should.equal(expectedJsFilePath + '.map');
      });
    stream.write(file);
    stream.end();
  });
});
