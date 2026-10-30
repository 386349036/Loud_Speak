const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {droppedImage,bindDrop}=require('./public/chat-images.js');
const png={name:'原始图片.png',type:'image/png',size:100};
assert.equal(droppedImage([png]),png);assert.throws(()=>droppedImage([]),/一张/);assert.throws(()=>droppedImage([png,png]),/一张/);assert.throws(()=>droppedImage([{...png,type:'image/svg+xml'}]),/PNG/);assert.throws(()=>droppedImage([{...png,size:20*1024*1024+1}]),/20 MB/);
class Target{constructor(){this.events={};this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k)};}addEventListener(type,fn){(this.events[type]??=[]).push(fn);}contains(node){return node===this;}emit(type,extra={}){const e={target:this,dataTransfer:{types:['Files'],files:[png]},preventDefault(){this.prevented=true;},...extra};for(const fn of this.events[type]||[])fn(e);return e;}}
const area=new Target(),doc=new Target(),win=new Target(),errors=[],selected=[];let enabled=true,busy=false;
const binding=bindDrop({area,document:doc,window:win,enabled:()=>enabled,busy:()=>busy,choose:f=>selected.push(f),error:e=>errors.push(e)});
area.emit('dragenter');area.emit('dragenter');area.emit('dragleave');assert(area.classes.has('image-drag-over'));area.emit('drop');assert.equal(selected.length,1);assert(!area.classes.size);
busy=true;area.emit('drop');assert.equal(selected.length,1);assert.match(errors.at(-1),/正在发送/);busy=false;enabled=false;area.emit('drop');assert.match(errors.at(-1),/不可用/);enabled=true;
area.emit('drop',{dataTransfer:{types:['Files'],files:[png,png]}});assert.equal(selected.length,1);
area.emit('dragenter');win.emit('blur');assert(!area.classes.size);area.emit('dragenter');binding.clear();assert(!area.classes.size);
const outside=doc.emit('drop');assert(outside.prevented);assert.match(errors.at(-1),/拖入聊天窗口/);const textDrag=area.emit('dragover',{dataTransfer:{types:['text/plain']}});assert(!textDrag.prevented);
// Exercise the actual attachment renderer: full-size blob and original filename.
class Node{constructor(tag){this.tag=tag;this.children=[];this.attributes={};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=v;}click(){this.clicked=true;}remove(){this.removed=true;}}
async function main(){const source=fs.readFileSync('public/chat.js','utf8'),start=source.indexOf('async function attachment('),end=source.indexOf('\nfunction render()',start);assert(start>=0&&end>start);
 const body=new Node('body'),requests=[],blobs=[],original=new Blob(['unmodified-original-image'],{type:'image/png'});const context={chatEnabled:true,token:'test-token',urls:new Map(),document:{body,createElement:tag=>new Node(tag)},URL:{createObjectURL:b=>{blobs.push(b);return 'blob:original';}},fetch:async(url,options)=>{requests.push({url,options});return {ok:true,blob:async()=>original};},$:()=>({textContent:''})};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const el=new Node('article'),m={id:'test-image',attachment:{url:'/api/files/test-image',name:png.name,mime:'image/png',size:original.size}};await context.attachment(m,el);assert.equal(el.children[0].tag,'img');assert.equal(el.children[1].textContent,'↓ 下载原图');assert.equal(blobs[0],original);await el.children[1].onclick({preventDefault(){}});assert.equal(body.children[0].download,png.name);assert.equal(body.children[0].href,'blob:original');assert(body.children[0].clicked&&body.children[0].removed);assert.equal(requests.length,1);assert.equal(requests[0].options.headers.Authorization,'Bearer test-token');
 const saveSource=source.slice(source.indexOf('async function saveAttachmentSticker('),source.indexOf("\n$('file').addEventListener"));
 const status={textContent:''},calls=[];let fail=false,refreshes=0;
 const saveContext={chatEnabled:true,FormData,$:()=>status,api:async(url,options)=>{calls.push({url,options});if(fail)throw Error('上传失败');},refreshStickers:async()=>refreshes++};
 vm.createContext(saveContext);vm.runInContext(saveSource,saveContext);
 const button={disabled:false},file=new File(['original'],'sticker.png',{type:'image/png'});
 const first=saveContext.saveAttachmentSticker(file,button);await saveContext.saveAttachmentSticker(file,button);await first;
 assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/stickers');assert.equal(calls[0].options.body.get('file').name,file.name);assert.equal(refreshes,1);assert.equal(button.disabled,true);assert.match(button.textContent,/已添加/);
 const retry={disabled:false};fail=true;await saveContext.saveAttachmentSticker(file,retry);assert.equal(retry.disabled,false);assert.match(status.textContent,/上传失败/);fail=false;await saveContext.saveAttachmentSticker(file,retry);assert.equal(retry.disabled,true);
 const before=calls.length;await saveContext.saveAttachmentSticker({size:5*1024*1024+1},{disabled:false});assert.equal(calls.length,before);assert.match(status.textContent,/5 MB/);
 saveContext.chatEnabled=false;await saveContext.saveAttachmentSticker(file,{disabled:false});assert.equal(calls.length,before);assert.match(status.textContent,/不可用/);
 console.log('PASS: image drag, original downloads, one-click sticker save, duplicate clicks, retry, size and closed-chat guards.');}
main().catch(e=>{console.error(e);process.exitCode=1;});
