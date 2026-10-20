let authMode='unconfigured',enrollmentId=null;
const post=(url,body)=>api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function initAuth(){
  const s=await api('/api/admin/auth');authMode=s.mode;
  $('code').hidden=authMode!=='totp';$('code').required=authMode==='totp';
  $('password').hidden=authMode!=='password';$('password').required=authMode==='password';
  $('auth-submit').hidden=authMode==='unconfigured';$('begin-enroll').hidden=authMode==='totp'||!s.local;
  $('recover-toggle').hidden=authMode!=='totp'||!s.local;$('rebind').hidden=!s.local;
  if(authMode==='unconfigured'){$('title').textContent='首次绑定 Google Authenticator';$('hint').textContent=s.local?'点击下方按钮，用手机扫描本机生成的二维码。':'请在部署电脑打开 http://localhost:3210/admin 完成首次绑定。'}
  else if(authMode==='password'){$('title').textContent='管理员登录 / 升级验证器';$('hint').textContent='输入原管理员密码，可直接绑定 Google Authenticator。确认绑定前原密码仍然有效。'}
}
async function beginEnrollment(){try{
  const d=await post('/api/admin/enroll/start',{password:$('password').value});enrollmentId=d.id;$('password').value='';
  $('login').hidden=true;$('dashboard').hidden=true;$('enrollment').hidden=false;$('totp-qr').src=d.qr;$('totp-secret').textContent=d.secret;$('error').textContent='';
}catch(e){fail(e)}}
$('begin-enroll').onclick=beginEnrollment;$('rebind').onclick=beginEnrollment;
$('auth').onsubmit=async e=>{e.preventDefault();try{
  await post('/api/admin/login',authMode==='totp'?{code:$('code').value}:{password:$('password').value});
  $('password').value='';$('code').value='';$('error').textContent='';await load();
}catch(e){fail(e)}};
$('confirm-enroll').onsubmit=async e=>{e.preventDefault();try{
  const d=await post('/api/admin/enroll/confirm',{id:enrollmentId,code:$('enroll-code').value});enrollmentId=null;
  $('totp-qr').removeAttribute('src');$('totp-secret').textContent='';$('enroll-code').value='';$('enrollment').hidden=true;$('error').textContent='';
  $('recovery-list').textContent=d.recoveryCodes.join('\n');$('recovery-box').hidden=false;authMode='totp';
}catch(e){fail(e)}};
$('recovery-saved').onclick=async()=>{$('recovery-list').textContent='';$('recovery-box').hidden=true;await load().catch(fail)};
$('recover-toggle').onclick=()=>{$('recover-form').hidden=!$('recover-form').hidden};
$('recover-form').onsubmit=async e=>{e.preventDefault();try{
  const d=await post('/api/admin/recovery',{code:$('recovery-code').value});$('recovery-code').value='';
  $('error').textContent='恢复登录成功，剩余 '+d.remaining+' 条恢复码。建议立即重新绑定验证器。';await load();
}catch(e){fail(e)}};
initAuth().then(()=>load().catch(()=>{})).catch(fail);
