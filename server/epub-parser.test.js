const {parseEpub,db}=require('./server');

function u16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n,0);return b}
function u32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0,0);return b}
function zip(entries){
  const locals=[],centrals=[];let offset=0;
  for(const {name,text} of entries){
    const nameBuf=Buffer.from(name,'utf8'),data=Buffer.from(text,'utf8');
    const local=Buffer.concat([
      Buffer.from('PK\x03\x04','binary'),u16(20),u16(0),u16(0),u16(0),u16(0),u32(0),u32(data.length),u32(data.length),u16(nameBuf.length),u16(0),nameBuf,data
    ]);
    locals.push(local);
    const central=Buffer.concat([
      Buffer.from('PK\x01\x02','binary'),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(0),u32(data.length),u32(data.length),u16(nameBuf.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBuf
    ]);
    centrals.push(central);offset+=local.length;
  }
  const body=Buffer.concat(locals),cd=Buffer.concat(centrals);
  const end=Buffer.concat([Buffer.from('PK\x05\x06','binary'),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(cd.length),u32(body.length),u16(0)]);
  return Buffer.concat([body,cd,end]);
}

try{
  const buf=zip([
    {name:'META-INF/container.xml',text:'<?xml version="1.0"?><container><rootfile full-path="OPS/package.opf"/></container>'},
    {name:'OPS/package.opf',text:'<package><metadata><dc:title>EPUB Test</dc:title><dc:creator>Tester</dc:creator></metadata><manifest><item media-type="application/xhtml+xml" href="chap%201.xhtml#top" id="c1"/></manifest><spine><itemref linear="yes" idref="c1"/></spine></package>'},
    {name:'OPS/chap 1.xhtml',text:'<html><body><h1>Chương 1</h1><p>Nội dung EPUB thuộc tính đảo thứ tự.</p></body></html>'}
  ]);
  const d=parseEpub(buf);
  if(d.title!=='EPUB Test'||d.author!=='Tester'||d.chapters.length!==1)throw Error('EPUB metadata/chapter parse failed: '+JSON.stringify({title:d.title,author:d.author,count:d.chapters.length}));
  if(d.chapters[0].title!=='Chương 1'||!d.chapters[0].content.includes('Nội dung EPUB thuộc tính đảo thứ tự.'))throw Error('EPUB href/spine parse failed: '+JSON.stringify(d.chapters[0]));
  console.log('EPUB spine/href regression OK');
}finally{db.close()}
