var staticModule = require('static-module');
var quote = require('quote-stream');
var fs = require('fs');
var path = require("path");
var through = require('through2');
var s2s = require('string-to-stream');

var React = require("react");

var autoprefixer = require("autoprefixer");
var postcss      = require('postcss');
var prefix       = require('postcss-prefix-selector')
var sha1         = require('sha1');
 

module.exports = function (file, opts) {
  if (/\.json$/.test(file)) return through();

  function resolver (p) {
    return resolve.sync(p, { basedir: path.dirname(file) });
  }

  var vars = {
    __filename: file,
    __dirname: path.dirname(file),
    require: { resolve: resolver }
  };

  if (!opts) {
    opts = {};
  }

  if (opts.vars) {
    Object.keys(opts.vars).forEach(function (key) {
      vars[key] = opts.vars[key];
    });
  }

  var sm = staticModule(
    {
      css: {
        readSync: readSync,
        react: react
      }
    },
    {
      vars: vars,
      varModules: {
        path: path
      }
    }
  );
  return sm;

  function readSync (file, enc) {
    var css = fs.readFileSync(file).toString();
    var className = sha1(file).substring(0, 10);

    var cssText = postcss([
        prefix({prefix: "."+className+" "}),
        autoprefixer
      ])
      .process(css)
      .css
      .toString()
    // var stream = s2s("{"
    //   +"className:"+JSON.stringify(className)+","
    //   +"css:"+JSON.stringify(cssText)
    // +"}")
    var stream = s2s(JSON.stringify(cssText))
    sm.emit('file', file);
    return stream;
  }

  function react(file) {
    var css = fs.readFileSync(file).toString();
    var className = sha1(file).substring(0, 10);

    var cssText = postcss([
        // prefix({prefix: "."+className+" "}),
        autoprefixer
      ])
      .process(css)
      .css
      .toString();

    var rawJs = "{"
      +"stylesheet: React.createElement(\"style\", {dangerouslySetInnerHTML: {__html: "+JSON.stringify(cssText)+"}}),"
      +"rootClassName: "+JSON.stringify(className)
    +"}";

    var stream = s2s(rawJs)
    sm.emit('file', file);
    return stream;
  }
};

module.exports.react = function(file) {
  var css = fs.readFileSync(file).toString();
  var className = sha1(file).substring(0, 10);

  var cssText = postcss([
    // prefix({prefix: "."+className+" "}),
    autoprefixer
  ])
  .process(css)
  .css
  .toString();

  return {
    stylesheet: React.createElement("style", {
      dangerouslySetInnerHTML: {__html: cssText}
    }),
    rootClassName: className
  };
}
module.exports.readSync = function() {}
