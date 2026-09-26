const {zipRead,db}=require('./server');
try{
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);
 const empty=zipRead(local,{lo:0,usize:0,csize:0,method:0});
 if(!Buffer.isBuffer(empty)||empty.length!==0)throw Error('valid empty ZIP entry failed');
 try{zipRead(local,{lo:0,usize:26*1024*1024,csize:0,method:0});throw Error('oversized ZIP entry accepted')}catch(e){if(e.message!=='ZIP_ENTRY_TOO_LARGE')throw e}
 try{zipRead(local,{lo:0,usize:1,csize:99,method:0});throw Error('out-of-range ZIP entry accepted')}catch(e){if(e.message!=='INVALID_ZIP_ENTRY')throw e}
 console.log('ZIP entry hardening OK');
}finally{db.close()}
