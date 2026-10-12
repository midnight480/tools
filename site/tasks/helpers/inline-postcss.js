'use strict';

const postcss = require('postcss');
const postcssHtmlModule = require('postcss-html');
const through = require('through2');

// postcss-html is ESM; require() returns its namespace with a default export.
const postcssHtml = postcssHtmlModule.default || postcssHtmlModule;

// inlinePostcss is a gulp transform that runs the given PostCSS plugins over
// CSS files and inline <style> blocks in HTML files.
module.exports = (plugins) => {
  return through.obj((file, enc, callback) => {
    if (file.isNull()) {
      return callback(null, file);
    }
    const options = {
      from: file.path,
    };
    if (file.path.endsWith('.html')) {
      options.syntax = postcssHtml;
    }
    postcss(plugins)
      .process(file.contents.toString(), options)
      .then((result) => {
        file.contents = Buffer.from(result.css);
        callback(null, file);
      })
      .catch(callback);
  });
};
