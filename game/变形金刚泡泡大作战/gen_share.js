const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const IP = "192.168.5.16";
const PORT = 3000;
const URL = `http://${IP}:${PORT}`;

(async () => {
  const dataUrl = await QRCode.toDataURL(URL, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 520,
    color: { dark: "#0d1b2a", light: "#ffffff" },
  });

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>变形金刚泡泡大作战 · 联机邀请</title>
<style>
  :root{ --cyan:#22d3ee; --acc:#7c5cff; --bg:#0d1117; --card:#161b22; }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:radial-gradient(1200px 600px at 50% -10%,#1b2a4a 0%,var(--bg) 60%);
       color:#e6edf3;font-family:"Segoe UI",system-ui,-apple-system,"Microsoft YaHei",sans-serif;padding:24px}
  .card{width:min(560px,100%);background:linear-gradient(180deg,#171d27,#12161d);
        border:1px solid #2b3340;border-radius:20px;padding:28px 26px 24px;
        box-shadow:0 24px 60px rgba(0,0,0,.55)}
  h1{margin:0 0 6px;font-size:22px;letter-spacing:.5px}
  .sub{margin:0 0 20px;color:#8b98a9;font-size:13.5px}
  .linkbox{display:flex;align-items:center;gap:10px;background:#0c1017;border:1px dashed #33404f;
           border-radius:12px;padding:12px 14px;margin-bottom:18px}
  .linkbox code{flex:1;font-size:17px;font-weight:700;color:var(--cyan);letter-spacing:.6px;
                word-break:break-all;font-family:ui-monospace,Consolas,monospace}
  .copy{border:0;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;
        background:linear-gradient(135deg,var(--cyan),var(--acc));color:#05121c;transition:.15s}
  .copy:hover{filter:brightness(1.12)}
  .copy.ok{background:#2ea043;color:#fff}
  .qr{display:flex;justify-content:center;margin:6px 0 16px}
  .qr img{width:min(300px,72vw);height:auto;background:#fff;border-radius:14px;padding:10px;
          box-shadow:0 8px 26px rgba(0,0,0,.45)}
  ol{margin:0;padding-left:20px;color:#c2cdd9;font-size:13.5px;line-height:1.85}
  ol b{color:#fff}
  .warn{margin-top:16px;font-size:12.5px;color:#f2b13c;background:rgba(242,177,60,.09);
        border:1px solid rgba(242,177,60,.28);border-radius:10px;padding:10px 12px;line-height:1.7}
  .keys{margin-top:14px;font-size:12.5px;color:#8b98a9;line-height:1.8}
  kbd{background:#0c1017;border:1px solid #33404f;border-bottom-width:2px;border-radius:6px;
      padding:1px 6px;font-size:12px;color:#e6edf3}
  .toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(20px);
         background:#22d3ee;color:#05121c;font-weight:700;padding:10px 18px;border-radius:10px;
         opacity:0;transition:.25s;pointer-events:none}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
  <div class="card">
    <h1>🤖 变形金刚泡泡大作战 · 联机邀请</h1>
    <p class="sub">同一个 WiFi / 同一局域网的伙伴，直接用手机或电脑浏览器打开下面的地址即可开打</p>

    <div class="linkbox">
      <code id="url">${URL}</code>
      <button class="copy" id="btn">复制链接</button>
    </div>

    <div class="qr"><img src="${dataUrl}" alt="扫码加入"></div>

    <ol>
      <li>确保大家连的是<b>同一个 WiFi / 同一网段</b>（这是局域网地址，外网打不开）</li>
      <li>打开链接 → 点 <b>创建房间</b>，会拿到一个 <b>4 位房间码</b></li>
      <li>把房间码告诉队友，队友进页面选 <b>加入房间</b> 输入即可</li>
      <li>房主点 <b>开始对战</b>，人不够会自动补电脑人（可选简单 / 困难）</li>
    </ol>

    <div class="keys">
      操作：<kbd>WASD</kbd>/<kbd>方向键</kbd> 移动 · <kbd>K</kbd>/<kbd>空格</kbd> 放炸弹 · <kbd>J</kbd> 手动引爆遥控弹
    </div>

    <div class="warn">
      ⚠️ 主机（${IP}）需要<b>保持开机且游戏服务在运行</b>，所有人才能进来；换 WiFi 后 IP 可能会变，届时重新生成这个页面。<br>
      如果对方打不开：在主机上用管理员身份执行
      <code style="color:#e6edf3">netsh advfirewall firewall add rule name="Bomberman3000" dir=in action=allow protocol=TCP localport=3000</code>
    </div>
  </div>
  <div class="toast" id="toast">已复制，快去粘贴给队友吧</div>
<script>
  const url = document.getElementById("url").textContent;
  const btn = document.getElementById("btn");
  const toast = document.getElementById("toast");
  btn.onclick = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch (e) {
      const t = document.createElement("textarea");
      t.value = url; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    btn.textContent = "已复制 ✓"; btn.classList.add("ok");
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); btn.textContent = "复制链接"; btn.classList.remove("ok"); }, 1800);
  };
</script>
</body>
</html>`;

  const out = path.join(__dirname, "share.html");
  fs.writeFileSync(out, html, "utf8");
  console.log("已生成:", out);
})();
