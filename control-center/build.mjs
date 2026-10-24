import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const f of ['index.html','style.css','app.mjs','engine.mjs']) await copyFile(f,`dist/${f}`);
console.log('Static build ready: dist/');
