const fs=require('fs'),os=require('os'),path=require('path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kho-seed-index-')),root=path.resolve(__dirname);
const seed={books:[{id:'seed-index-test',title:'Seed Index Test',author:'CI',category:'Test',status:'FULL',chapters:[{index:'abc',title:'Bad Index',content:'Seed content with enough text to remain valid for this regression.'},{index:2,title:'Good',content:'Another seed chapter with enough text for validation.'}]}]};
fs.writeFileSync(path.join(dir,'seed.json'),JSON.stringify(seed));
process.env.KHO_DATA_DIR=dir;
const {db}=require('./server');
try{
 const rows=db.prepare('SELECT chapter_index,title FROM chapters WHERE story_id=? ORDER BY chapter_index').all('seed-index-test');
 if(rows.length!==2||rows[0].chapter_index!==0||rows[1].chapter_index!==2)throw Error('Malformed seed index not normalized: '+JSON.stringify(rows));
 console.log('seed index normalization OK');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true})}
