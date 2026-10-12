'use strict';

const finalhandler = require('finalhandler');
const http = require('http');
const path = require('path');
const serveStatic = require('serve-static');

// serve starts a static file server rooted at dir and returns the server. The
// listening server keeps the process alive, like gulp-webserver did.
module.exports = (dir, options) => {
  options = options || {};
  const staticFiles = serveStatic(path.resolve(dir), { index: 'index.html' });
  const server = http.createServer((req, res) => {
    staticFiles(req, res, finalhandler(req, res));
  });
  const port = options.port || 8000;
  server.listen(port, () => {
    console.log(`Serving ${dir} at http://localhost:${port}`);
  });
  return server;
};
