// Tiny optional local preview server. The deployed site needs only HTML/CSS/JS.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),root=path.resolve(__dirname,'..');
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(file===root||file.endsWith(path.sep))file=path.join(file,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});}).listen(Number(option('--port',8000)),option('--host','127.0.0.1'));
