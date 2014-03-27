var es = require('event-stream');
var through2 = require('through2');
var Meta = require('meta-script')();
var gutil = require('gulp-util');
var Buffer = require('buffer').Buffer;
var path = require('path');

function streamify(obj) {
  return require('streamifier').createReadStream(obj);
}

function errorForFile(file, error) {
  var errorWithFile = Object.create(error);
  error.message = error.message + ' (' + file.path + ':' + error.line + ':' + error.column + ')';
  error.path = file.path;
  error.toString = function() {
    return this.message;
  };
  return errorWithFile;
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
          var result;
          try {
            result = compiler.done();
          } catch (e) {
            fileStream.emit('error', e);
            return done();
          }
          if (result.errors) {
            var errors = result.errors;
            if (errors.length > 0) {
              for (var i = 0; i < errors.length; ++i) {
                fileStream.emit('error', errorForFile(file, errors[i]));
              }
            } else {
              fileStream.emit('error', new Error('Unknown compiler error'));
            }
            return done();
          }
          function pushFile(path, content) {
            fileStream.push(
              new gutil.File({
                cwd: file.cwd,
                base: file.base,
                path: path,
                contents: new Buffer(content)}));
          };
          var jsFilePath = gutil.replaceExtension(file.path, '.js');
          if (options.debug && result.map) {
            var smFilePath = jsFilePath + '.map';
            pushFile(jsFilePath, result.code + "\n//# sourceMappingURL=" + path.basename(smFilePath));
            pushFile(smFilePath, result.map);
          } else {
            pushFile(jsFilePath, result.code);
          }
          return done();
        }));
  }

  return through2.obj(compileFile);
};
