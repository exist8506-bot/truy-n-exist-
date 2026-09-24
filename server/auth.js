const crypto=require('crypto');
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function token(){return crypto.randomBytes(32).toString('hex')}
module.exports={hash,token};
