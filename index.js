var es = require('event-stream');
var Meta = require('meta-script')();
var gutil = require('gulp-util');
var Buffer = require('buffer').Buffer;
var path = require('path');

function streamify(obj) {
  return require('streamifier').createReadStream(obj);
}

function compileFile(file, done) {

  if (file.isNull())
    return done(null, file);

  var stream = file.isStream() ? file.contents : streamify(file.contents);
  var compiler = Meta.createCompiler({name: file.name});
  return es.pipeline(
    stream,
    es.split(),
    es.through(
      function processLine(line) {
        try {
            compiler.parser.processLine(line);
        } catch (e) {
            done(e, null);
        }
      },
      function end() {
        try {
          compiler.parseDone();
          var ast = compiler.produceAst();
          var result = compiler.generate(ast);
          var jsFile = new gutil.File({
              cwd: file.cwd,
              base: file.base,
              path: gutil.replaceExtension(file.path, '.js'),
              contents: new Buffer(result.code)
          });
          done(null, jsFile);
        } catch (e) {
          done(e, null);
        }
      }));
}

module.exports = function () {
  return es.map(compileFile);
};
