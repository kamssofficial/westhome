const fs=require('fs'),p=require('path');
const dir='.freebuff/pages';
if(!fs.existsSync(dir)){console.log('No pages dir');process.exit(1);}
fs.readdirSync(dir).filter(f=>f.endsWith('.txt')).forEach(f=>{
  const target=f.replace('.txt','').replace(/__/g,'/');
  const content=fs.readFileSync(p.join(dir,f),'utf-8');
  fs.mkdirSync(p.dirname(target),{recursive:true});
  fs.writeFileSync(target,content,'utf-8');
  console.log('Wrote',target,content.length);
});
