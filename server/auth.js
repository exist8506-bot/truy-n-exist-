const crypto=require('crypto');
function hash(password,salt=crypto.randomBytes(16).toString('hex')){const passwordHash=crypto.scryptSync(String(password),salt,64).toString('hex');return {passwordHash,salt}}
function verify(password,passwordHash,salt){return crypto.timingSafeEqual(Buffer.from(passwordHash,'hex'),crypto.scryptSync(String(password),salt,64))}
function token(){return crypto.randomBytes(32).toString('hex')}
module.exports={hash,verify,token};