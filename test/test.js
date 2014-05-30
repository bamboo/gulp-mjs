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

  function assertJsFile(jsFile, expectedSuffix) {
    jsFile.path.should.equal(expectedJsFilePath);
    jsFile.contents.toString().should.equal(compile(code) + (expectedSuffix || ""));
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
        resultingFiles.length.should.equal(2);
        var smFile = resultingFiles[0];
        var jsFile = resultingFiles[1];
        smFile.path.should.equal(expectedJsFilePath + '.map');
        assertJsFile(jsFile, "\n//# sourceMappingURL=" + path.basename(smFile.path));
      });
    stream.write(file);
    stream.end();
  });

  it('should embed source map when map option is "-"', function() {
    var resultingFiles = [];
    var stream = mjs({debug: true, map: '-'})
      .on('data', function (data) {
        resultingFiles.push(data);
      })
      .on('end', function () {
        resultingFiles.length.should.equal(1);
        var js = resultingFiles[0].contents.toString();
        js.should.match(/^\/\/# sourceMappingURL=data:application\/json;base64,[A-Za-z0-9=\/\+]+$/m);
      })
    stream.write(file);
    stream.end();
  });
});

describe('mjs error', function() {
  var code = "foo";
  var file = createFile('/src/path/file.mjs', new Buffer(code));

  it('should be emitted as error event', function() {
    var events = [];
    var stream = mjs()
      .on('data', function (data) {
        events.push(data);
      })
      .on('error', function (error) {
        events.push(error);
      })
      .on('end', function () {
        events.length.should.equal(1);
        var expected = 'Undeclared identifier "foo" (/src/path/file.mjs:1:0)';
        events[0].message.should.equal(expected);
        events[0].toString().should.equal(expected);
      });
    stream.write(file);
    stream.end();
  });
});
