var es = require('event-stream');
var through2 = require('through2');
var Meta = require('meta-script')();
var gutil = require('gulp-util');
var Buffer = require('buffer').Buffer;
var path = require('path');

function streamify(obj) {
  return require('streamifier').createReadStream(obj);
}

module.exports = function (options) {

  options = options || {debug: false};

  function compileFile(file, enc, done) {

    var fileStream = this;
    if (file.isNull()) {
      fileStream.push(file);
      return done();
    }

    var stream = file.isStream() ? file.contents : streamify(file.contents);
    var compiler = Meta.createLineStreamCompiler(file.path, options.debug ? {map: true, source: file.path} : undefined);
    return es.pipeline(
      stream,
      es.split(),
      es.through(
        function(line) { compiler.onLine(line); },
        function() {
          var result = compiler.done();
          function pushFile(path, content) {
            fileStream.push(
              new gutil.File({
                cwd: file.cwd,
                base: file.base,
                path: path,
                contents: new Buffer(content)}));
          };
          var jsFilePath = gutil.replaceExtension(file.path, '.js');
          pushFile(jsFilePath, result.code);
          if (options.debug && result.map) {
            pushFile(jsFilePath + '.map', result.map);
          }
          done();
        }));
  }

  return through2.obj(compileFile);
};
