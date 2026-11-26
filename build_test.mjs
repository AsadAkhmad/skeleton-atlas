import esbuild from 'esbuild';
import fs from 'fs';
const entry = process.argv[2] || 'src/test.js';
const out = process.argv[3] || 'dist/test.html';
const r = await esbuild.build({ entryPoints: [entry], bundle: true, minify: false, format: 'iife', write: false, target: 'es2020', logLevel: 'error' });
const js = r.outputFiles[0].text;
fs.writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#15161a;overflow:hidden}canvas{width:100%;height:100%;display:block}#log{position:fixed;left:8px;top:8px;color:#9ab;font:11px monospace;white-space:pre}</style></head><body><canvas id="c"></canvas><div id="log"></div><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`);
console.log('built', out, (js.length / 1024) | 0, 'KB');
