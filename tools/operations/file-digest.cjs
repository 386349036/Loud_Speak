const crypto=require('node:crypto');
module.exports=function fileDigest(file,bytes){
 let body=bytes;
 if(file==='manifest.json'||file==='assets/manifest.json'){
  const m=JSON.parse(bytes.toString('utf8'));
  if(m.deliveryVersion!==undefined&&!/^[a-f0-9]{16}$/.test(m.deliveryVersion))throw Error('Invalid delivery revision');
  delete m.deliveryVersion;body=Buffer.from(JSON.stringify(m));
 }else if(/\.(mjs|js|css|html|json)$/.test(file))body=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
 return crypto.createHash('sha256').update(body).digest('hex');
};
