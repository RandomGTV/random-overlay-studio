import{mkdir,readFile,writeFile,cp,readdir}from'node:fs/promises';import{createHash}from'node:crypto';import{validateConfig}from'../core.js';
const files=['index.html','overlay.html','studio.css','overlay.css','studio.js','overlay.js','core.js','data.js','config.json'];
validateConfig(JSON.parse(await readFile('config.json','utf8')));
const hash=createHash('sha256');for(const file of files)hash.update(await readFile(file));
async function hashAssets(path){for(const entry of(await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=path+'/'+entry.name;hash.update(p);if(entry.isDirectory())await hashAssets(p);else hash.update(await readFile(p));}}
await hashAssets('assets');const id=hash.digest('hex').slice(0,20);
await mkdir('dist',{recursive:true});for(const file of files){let text=await readFile(file,'utf8');if(file.endsWith('.html'))text=text.replace(/(href|src)="((?:studio|overlay)\.(?:css|js))"/g,`$1="$2?v=${id}"`);if(file.endsWith('.js'))text=text.replace(/(['"])(\.\/(?:core|data)\.js)\1/g,`$1$2?v=${id}$1`);await writeFile('dist/'+file,text);}
await cp('assets','dist/assets',{recursive:true});await writeFile('dist/version.json',JSON.stringify({id,builtAt:new Date().toISOString()})+'\n');await writeFile('dist/.nojekyll','');console.log('Built GitHub Pages site '+id+' in dist/.');
