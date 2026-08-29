const fs=require('fs'),path=require('path'),zlib=require('zlib');
let b='';
for(let i=0;;i++){
  const f=path.join('.merge',`source-${i}.txt`);
  if(!fs.existsSync(f)) break;
  b+=fs.readFileSync(f,'utf8');
}
if(!b) throw new Error('Missing staged source bundle');
const files=JSON.parse(zlib.gunzipSync(Buffer.from(b,'base64')).toString('utf8'));
for(const [file,data] of Object.entries(files)){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,data);
}
console.log(`Prepared ${Object.keys(files).length} V2 source files`);
