const fs=require('fs'),path=require('path'),crypto=require('crypto'),multer=require('multer'),sharp=require('sharp');
const {rateLimit}=require('express-rate-limit');
module.exports=({app,db,root,auth,admin,isAdmin,chatOpen,chatEnabled,io})=>{
 const folder=path.join(root,'stickers');fs.mkdirSync(folder,{recursive:true});
 db.exec('CREATE TABLE IF NOT EXISTS stickers(id TEXT PRIMARY KEY,file TEXT NOT NULL,hash TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL)');
 const get=id=>db.prepare('SELECT * FROM stickers WHERE id=?').get(id);
 const publicItem=s=>({id:s.id,url:'/api/stickers/'+s.id+'/image',mime:s.mime,size:s.size,created:s.created});
 const list=()=>db.prepare('SELECT * FROM stickers ORDER BY created DESC,id DESC').all().map(publicItem);
 const gate=(req,res,next)=>isAdmin(req)?next():auth(req,res,()=>chatOpen(req,res,next));
 app.get('/api/stickers',auth,chatOpen,(req,res)=>res.json(list()));
 app.get('/api/admin/stickers',admin,(req,res)=>res.json(list()));
 app.get('/api/stickers/:id/image',gate,(req,res)=>{const s=get(req.params.id);if(!s)return res.sendStatus(404);res.type(s.mime);res.sendFile(path.join(folder,s.file))});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0}}).single('file');
 app.post('/api/stickers',auth,chatOpen,rateLimit({windowMs:60000,limit:5,keyGenerator:req=>req.user.token}), (req,res)=>upload(req,res,async err=>{
  if(err)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:err.code==='LIMIT_FILE_SIZE'?'表情不能超过 5 MB':'请选择一张表情图片'});
  try{
   if(!req.file)return res.status(400).json({error:'请选择表情图片'});
   const image=sharp(req.file.buffer,{animated:true,limitInputPixels:40000000,failOn:'warning'}),meta=await image.metadata();
   const types={png:'image/png',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
   if(!types[meta.format]||!meta.width||!meta.height||meta.width>2048||(meta.pageHeight||meta.height)>2048||(meta.pages||1)>100)throw Error('invalid');
   await image.raw().toBuffer();
   if(!chatEnabled())return res.status(403).json({code:'CHAT_CLOSED',error:'404 页面暂时无法访问'});
   const hash=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
   let s=db.prepare('SELECT * FROM stickers WHERE hash=?').get(hash);
   if(!s){const id=crypto.randomUUID(),file=crypto.randomUUID();fs.writeFileSync(path.join(folder,file),req.file.buffer);try{db.prepare('INSERT INTO stickers VALUES(?,?,?,?,?,?)').run(id,file,hash,types[meta.format],req.file.size,Date.now())}catch(e){fs.rmSync(path.join(folder,file),{force:true});throw e}s=get(id);io.emit('stickers-changed',{id:s.id})}
   res.json(publicItem(s));
  }catch{res.status(400).json({error:'请上传完整的 PNG、JPEG、WebP 或 GIF 图片，边长不超过 2048 像素、动图不超过 100 帧'})}
 }));
 app.delete('/api/admin/stickers/:id',admin,(req,res)=>{const s=get(req.params.id);if(!s)return res.sendStatus(404);db.prepare('DELETE FROM stickers WHERE id=?').run(s.id);fs.rmSync(path.join(folder,s.file),{force:true});io.emit('stickers-changed',{removed:s.id});res.json({ok:true})});
 return {copy(id){const s=get(id);if(!s)return null;const filename=crypto.randomUUID();fs.copyFileSync(path.join(folder,s.file),path.join(root,'files',filename));return {filename,originalname:'sticker.'+s.mime.split('/')[1],mimetype:s.mime,size:s.size}}};
};
