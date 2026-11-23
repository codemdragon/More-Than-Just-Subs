/**
 * More Than Just Subs — Island Site Dev Server
 * Run: node server.js  →  http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SITE_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serve(req, res) {
  let urlPath = req.url.split('?')[0].replace(/\/+$/, '') || '/';
  let filePath = path.join(SITE_DIR, urlPath);
  for (const candidate of [filePath, filePath + '.html', path.join(filePath, 'index.html')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(candidate).pipe(res);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`<h1>404</h1><p>${urlPath}</p><a href="/">Home</a>`);
}

http.createServer(serve).listen(PORT, () => {
  console.log(`\n  🥖 Island — More Than Just Subs`);
  console.log(`  ➡️  http://localhost:${PORT}`);
  console.log(`  ➡️  CMS: http://localhost:${PORT}/cms/admin.html\n`);
});
