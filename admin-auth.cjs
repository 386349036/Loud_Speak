const crypto=require('crypto'),fs=require('fs'),path=require('path'),OTPAuth=require('otpauth'),QR=require('qrcode');
const {rateLimit}=require('express-rate-limit');
module.exports=function installAuth({app,db,get,set,root,local,isAdmin,admins,hash,issue}){
  const keyPath=path.join(root,'auth.key');
  if(!fs.existsSync(keyPath))fs.writeFileSync(keyPath,crypto.randomBytes(32),{mode:0o600,flag:'wx'});
  const key=fs.readFileSync(keyPath);if(key.length!==32)throw Error('Invalid auth encryption key');
  const encrypt=text=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(text,'utf8'),c.final(),c.getAuthTag()]).toString('base64')};
  const decrypt=value=>{const b=Buffer.from(value,'base64'),d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString('utf8')};
  const make=secret=>new OTPAuth.TOTP({issuer:'Loud Speak',label:'管理员',algorithm:'SHA1',digits:6,period:30,secret:OTPAuth.Secret.fromBase32(secret)});
  const verify=(secret,code)=>{if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const t=make(secret),now=Date.now(),delta=t.validate({token:code,window:1,timestamp:now});return delta===null?null:Math.floor(now/30000)+delta};
  const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
  const passwordOK=p=>typeof p==='string'&&p.length<=128&&!!get('password')&&crypto.timingSafeEqual(Buffer.from(hash(p,get('salt'))),Buffer.from(get('password')));
  let pending=null;
  app.get('/api/admin/auth',(req,res)=>res.json({mode:get('totp')?'totp':get('password')?'password':'unconfigured',local:local(req)}));
  const limit=rateLimit({windowMs:900000,limit:10,message:{error:'尝试过于频繁，请 15 分钟后重试'}});
  app.post('/api/admin/enroll/start',limit,async(req,res,next)=>{try{
    if(!local(req))return res.status(403).json({error:'绑定验证器仅允许在部署电脑 localhost 完成'});
    if(get('totp')?!isAdmin(req):(get('password')&&!isAdmin(req)&&!passwordOK(req.body.password)))return res.status(401).json({error:'请先登录，或输入当前管理员密码'});
    if(pending&&pending.until>Date.now())return res.status(409).json({error:'已有绑定操作进行中，请完成原页面操作，或 10 分钟后重试'});
    const secret=new OTPAuth.Secret({size:20}).base32,id=crypto.randomBytes(32).toString('hex');pending={id,secret,until:Date.now()+600000,version:get('totp')||null};
    const qr=await QR.toDataURL(make(secret).toString(),{width:240,margin:2});
    res.json({id,secret,qr,expires:pending.until});
  }catch(e){next(e)}});
  app.post('/api/admin/enroll/confirm',limit,(req,res)=>{
    if(!local(req)||!pending||pending.until<Date.now()||pending.id!==req.body.id)return res.status(403).json({error:'绑定已过期，请重新开始'});
    if((get('totp')||null)!==pending.version)return res.status(409).json({error:'验证器配置已改变，请刷新页面'});
    // Existing TOTP enrollment can only be replaced from an authenticated session.
    if(get('totp')&&!isAdmin(req))return res.sendStatus(401);
    const counter=verify(pending.secret,req.body.code);if(counter===null)return res.status(401).json({error:'验证码不正确，请检查手机时间并重试'});
    const codes=Array.from({length:10},()=>crypto.randomBytes(16).toString('hex').match(/.{8}/g).join('-'));
    db.transaction(()=>{set('totp',encrypt(pending.secret));set('totpCounter',counter);set('recovery',JSON.stringify(codes.map(digest)));db.prepare("DELETE FROM config WHERE key IN ('password','salt')").run()})();
    pending=null;admins.clear();issue(res);res.json({ok:true,recoveryCodes:codes});
  });
  app.post('/api/admin/login',limit,(req,res)=>{
    if(get('totp')){const counter=verify(decrypt(get('totp')),req.body.code);if(counter===null||counter<=Number(get('totpCounter')))return res.status(401).json({error:'验证码无效或已使用，请等待下一组验证码'});set('totpCounter',counter)}
    else if(!passwordOK(req.body.password))return res.status(401).json({error:'密码不正确，或尚未完成验证器绑定'});
    issue(res);res.json({ok:true});
  });
  app.post('/api/admin/recovery',limit,(req,res)=>{
    if(!local(req))return res.status(403).json({error:'恢复码仅限部署电脑 localhost 使用'});
    if(!get('totp')||typeof req.body.code!=='string')return res.sendStatus(401);
    const code=req.body.code.trim().toLowerCase();if(!/^[a-f0-9]{8}(-[a-f0-9]{8}){3}$/.test(code))return res.status(401).json({error:'恢复码无效或已使用'});
    const codes=JSON.parse(get('recovery')||'[]'),i=codes.indexOf(digest(code));if(i<0)return res.status(401).json({error:'恢复码无效或已使用'});
    codes.splice(i,1);set('recovery',JSON.stringify(codes));issue(res);res.json({ok:true,remaining:codes.length});
  });
};
