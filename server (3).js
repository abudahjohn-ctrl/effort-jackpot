// Effort Jackpot live tracker - zero dependencies. Run: node server.js
const http = require('http'), fs = require('fs'), path = require('path');

const CFG = {
  port: process.env.PORT || 3000,
  secret: process.env.SECRET || 'change-me',          // protects the webhooks
  target: 150000,
  days: 15,
  startDate: '2026-11-02',                            // Day 1 (East Africa Time)
  guests: { '2026-11-02': 'Grace Wanjohi' },          // guest per date, add more
};
const DB = path.join(__dirname, 'data.json');
let db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : { payments: [] };
const save = () => fs.writeFileSync(DB, JSON.stringify(db, null, 1));
const clients = new Set();
const INDEX_HTML = "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>PCEA Chemichemi \u2013 Effort Jackpot</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Playfair+Display:ital@1&display=swap\" rel=\"stylesheet\">\n<style>\n:root{--navy:#14307a;--red:#c8102e;--gold:#ffd23f;--bg:#eaf2fc;--ink:#14307a}\n*{box-sizing:border-box}\nbody{margin:0;background:#dfe6f0;font-family:Oswald,Arial,sans-serif;color:var(--ink);display:flex;justify-content:center}\n.poster{width:100%;max-width:440px;background:var(--bg);padding:16px;min-height:100vh}\n.top{display:flex;justify-content:space-between;align-items:center;font-size:22px;font-weight:700}\n.daybox{border:2px solid var(--gold);background:#fff;border-radius:8px;padding:4px 12px;text-align:center;font-size:12px;color:var(--red)}\n.daybox b{display:block;font-size:22px;color:var(--navy)}\n.hero{margin:14px 0 8px;border-radius:12px;padding:14px;text-align:center;background:linear-gradient(90deg,var(--red),var(--navy));border-bottom:4px solid var(--navy)}\n.hero .a{color:var(--gold);font-size:52px;font-weight:700;line-height:1}.hero .b{color:#fff;font-size:48px;font-weight:700;line-height:1}\n.goal{text-align:center;font-size:26px;font-weight:700;margin:6px 0 0}.goal i{color:var(--red);font-family:'Playfair Display',serif}\n.tag{text-align:center;font-family:'Playfair Display',serif;font-style:italic;margin:4px 0 12px}\n.red{background:var(--red);color:#fff;border-radius:8px;text-align:center;padding:8px;font-size:13px}.red b{display:block;color:var(--gold);font-size:22px}\n.guest{background:var(--navy);color:#fff;border-radius:8px;text-align:center;padding:12px;margin:10px 0;border:1px solid var(--gold)}\n.guest span{background:var(--gold);color:var(--navy);font-size:11px;padding:3px 12px;border-radius:99px;font-weight:700}.guest div{font-size:22px;margin-top:8px}\n.card{background:#fff;border:2px solid var(--navy);border-radius:12px;padding:12px;text-align:center}\n.card small{font-size:11px}\n.bar{height:20px;border:1px solid var(--navy);border-radius:10px;background:#e9eef7;overflow:hidden;margin:8px 0}\n.fill{height:100%;width:0;background:linear-gradient(90deg,#2e9e4f,var(--gold),var(--red));transition:width 1.2s ease}\n.amt{font-size:34px;font-weight:700}.pct{display:inline-block;background:var(--gold);padding:2px 22px;border-radius:99px;font-weight:700}\n.flash{animation:f .9s}@keyframes f{40%{color:var(--red);transform:scale(1.08)}}\n.recent{margin:10px 0 0;padding:0;list-style:none;font-size:13px;text-align:left}\n.recent li{display:flex;justify-content:space-between;border-top:1px dashed #b9c6df;padding:4px 0}\n.keep{background:var(--navy);color:#fff;border-radius:6px;text-align:center;font-size:12px;padding:8px;margin:12px 0;font-weight:700}.keep b{color:var(--gold)}\n.foot{display:flex;justify-content:space-around;text-align:center;font-size:12px}.foot b{display:block;color:var(--red);font-size:20px}\n.glory{background:var(--red);color:#fff;text-align:center;border-radius:6px;padding:8px;margin-top:12px;font-size:13px;font-weight:700}\n@media(prefers-reduced-motion:reduce){.fill{transition:none}.flash{animation:none}}\n</style></head><body><main class=\"poster\">\n<div class=\"top\"><span>PCEA CHEMICHEMI</span><div class=\"daybox\">DAY<b id=\"day\">1/15</b></div></div>\n<div class=\"hero\"><div class=\"a\">EFFORT</div><div class=\"b\">JACKPOT</div></div>\n<div class=\"goal\">150,000/- <i>in</i> 15 DAYS</div><div class=\"tag\">One Meal, One Mission</div>\n<div class=\"red\"><span id=\"dl\">DAY 1/15 \u2022 TIME LEFT TODAY</span><b id=\"left\">--</b></div>\n<div class=\"guest\" id=\"g\"><span>OUR GUEST TODAY</span><div id=\"guest\"></div></div>\n<div class=\"card\"><small>CURRENT PROGRESS as of <b id=\"asof\">--</b> Hours</small>\n<div class=\"bar\"><div class=\"fill\" id=\"fill\"></div></div>\n<div class=\"amt\" id=\"amt\">0 / 150,000</div><div class=\"pct\" id=\"pct\">0%</div>\n<ul class=\"recent\" id=\"recent\"></ul></div>\n<div class=\"keep\">KEEP GOING \u2013 EVERY EFFORT COUNTS! <b>GOD WILL DO IT!</b></div>\n<div class=\"foot\"><div>CONTACT<b>0722 269 233</b></div><div>TODAY<b id=\"date\" style=\"color:var(--navy);font-size:15px\"></b></div></div>\n<div class=\"glory\">GLORY TO GOD!</div></main>\n<script>\nconst $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-KE');\nconst eat=()=>new Date(Date.now()+3*3600e3);let last=-1;\nfunction render(s){\n  $('day').textContent=s.day+'/'+s.days;$('dl').textContent='DAY '+s.day+'/'+s.days+' \u2022 TIME LEFT TODAY';\n  $('guest').textContent=s.guest;$('g').style.display=s.guest?'':'none';\n  $('fill').style.width=Math.max(s.percent,1)+'%';\n  $('amt').textContent=fmt(s.total)+' / '+fmt(s.target);$('pct').textContent=s.percent+'%';\n  const t=eat();$('asof').textContent=String(t.getUTCHours()).padStart(2,'0')+':'+String(t.getUTCMinutes()).padStart(2,'0');\n  $('recent').innerHTML=s.recent.map(r=>`<li><span>${r.name.replace(/[<>&]/g,'')}</span><b>Ksh ${fmt(r.amount)}</b></li>`).join('');\n  if(last>=0&&s.total>last){$('amt').classList.remove('flash');void $('amt').offsetWidth;$('amt').classList.add('flash')}\n  last=s.total;\n}\nfunction tick(){const t=eat(),m=86400-(t.getUTCHours()*3600+t.getUTCMinutes()*60+t.getUTCSeconds());\n  $('left').textContent=`${Math.floor(m/3600)}h ${Math.floor(m%3600/60)}m ${m%60}s`;\n  $('date').textContent=t.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).toUpperCase()}\nsetInterval(tick,1000);tick();\nfetch('/api/progress').then(r=>r.json()).then(render).catch(()=>{});\nconst es=new EventSource('/events');es.onmessage=e=>render(JSON.parse(e.data));\n</script></body></html>\n";
const ADMIN_HTML = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Effort Jackpot \u2013 Admin</title><style>body{font-family:Arial,sans-serif;max-width:460px;margin:20px auto;padding:0 14px;color:#14307a}\ntextarea,input{width:100%;padding:10px;margin:6px 0;border:1px solid #9fb0d3;border-radius:6px;font:inherit;box-sizing:border-box}\nbutton{background:#14307a;color:#fff;border:0;border-radius:6px;padding:10px 16px;font:inherit;margin:4px 6px 4px 0}#out{color:#c8102e;white-space:pre-wrap}</style></head><body>\n<h2>Effort Jackpot \u2013 Admin</h2><input id=\"k\" type=\"password\" placeholder=\"Admin password\">\n<textarea id=\"t\" rows=\"6\" placeholder=\"Paste one or many M-Pesa messages\"></textarea><button id=\"go\">Add messages</button>\n<hr><input id=\"a\" type=\"number\" placeholder=\"Amount (Ksh) for cash/other\"><input id=\"n\" placeholder=\"Name (optional)\"><button id=\"man\">Add amount</button>\n<hr><button id=\"exp\">Download backup</button><div id=\"out\"></div>\n<script>const $=i=>document.getElementById(i),q=()=>encodeURIComponent($('k').value);\n$('go').onclick=async()=>{const parts=$('t').value.split(/(?=\\b[A-Z0-9]{10}\\s+Confirmed)/).filter(x=>x.trim());let r=[];\nfor(const p of parts){try{const x=await fetch('/webhook/sms?key='+q(),{method:'POST',body:JSON.stringify({message:p})});r.push(x.status==401?'WRONG PASSWORD':(await x.json()).result)}catch(e){r.push('error')}}\n$('out').textContent=r.join(', ')||'Nothing to add';$('t').value=''};\n$('man').onclick=async()=>{const x=await fetch('/admin/add?key='+q()+'&amount='+$('a').value+'&name='+encodeURIComponent($('n').value));$('out').textContent=x.status==401?'WRONG PASSWORD':JSON.stringify(await x.json())};\n$('exp').onclick=()=>location='/admin/export?key='+q();</script></body></html>";

const total = () => db.payments.reduce((s, p) => s + p.amount, 0);
const eatDate = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
function state() {
  const today = eatDate();
  const day = Math.min(CFG.days, Math.max(1, Math.floor((Date.parse(today) - Date.parse(CFG.startDate)) / 864e5) + 1));
  const t = total();
  return {
    total: t, target: CFG.target, percent: Math.min(100, Math.round(t / CFG.target * 1000) / 10),
    day, days: CFG.days, guest: CFG.guests[today] || '',
    recent: db.payments.slice(-5).reverse().map(p => ({ name: p.name.split(' ')[0], amount: p.amount, at: p.at })),
    updated: new Date().toISOString(),
  };
}
const push = () => { const d = `data: ${JSON.stringify(state())}\n\n`; clients.forEach(c => c.write(d)); };

function addPayment({ code, amount, name }) {
  amount = Number(amount);
  if (!code || !(amount > 0)) return 'ignored';
  if (db.payments.some(p => p.code === code)) return 'duplicate';
  db.payments.push({ code, amount, name: name || 'Friend', at: new Date().toISOString() });
  save(); push(); return 'added';
}

// Parses the M-Pesa confirmation SMS text
function parseSms(t) {
  const code = (t.match(/\b([A-Z0-9]{10})\s+Confirmed/i) || [])[1];
  const amt = (t.match(/received\s+Ksh\.?\s?([\d,]+(?:\.\d+)?)/i) || t.match(/Ksh\.?\s?([\d,]+(?:\.\d+)?)\s+received/i) || [])[1];
  if (!code || !amt) return null;
  const name = (t.match(/from\s+(.+?)\s+(?:\d{3,}|0\d|\+?254|on\s)/i) || [])[1];
  return { code: code.toUpperCase(), amount: amt.replace(/,/g, ''), name };
}

const body = req => new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const authed = url.searchParams.get('key') === CFG.secret;
  if (req.method === 'POST' || url.pathname.startsWith('/admin/')) console.log(new Date().toISOString(), req.method, url.pathname, authed ? 'key OK' : 'WRONG/MISSING KEY');

  if (req.method === 'GET' && url.pathname === '/api/progress') return json(res, 200, state());
  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state())}\n\n`); clients.add(res);
    req.on('close', () => clients.delete(res)); return;
  }

  // 1) Phone SMS-forwarder app posts the M-Pesa SMS here (POST or GET, any common format)
  if ((req.method === 'POST' || req.method === 'GET') && url.pathname === '/webhook/sms') {
    if (!authed) return json(res, 401, { error: 'bad key' });
    const raw = req.method === 'POST' ? await body(req) : '';
    let cands = [raw, decodeURIComponent((raw + '').replace(/\+/g, ' ')).toString()];
    try { const j = JSON.parse(raw); cands.push(JSON.stringify(j).replace(/\\n/g, ' ')); const walk = o => { if (typeof o === 'string') cands.unshift(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); }; walk(j); } catch {}
    url.searchParams.forEach((v, k) => { if (k !== 'key') cands.unshift(v); });
    let p = null; for (const c of cands) { try { p = parseSms(String(c)); } catch {} if (p) break; }
    const result = p ? addPayment(p) : 'not an M-Pesa receipt';
    console.log('SMS hook ->', result, '| body:', raw.slice(0, 300));
    return json(res, 200, { result });
  }
  // 2) Safaricom Daraja C2B confirmation (only if you get a Paybill/Till)
  if (req.method === 'POST' && url.pathname === '/webhook/mpesa') {
    if (!authed) return json(res, 401, { error: 'bad key' });
    try { const j = JSON.parse(await body(req));
      addPayment({ code: j.TransID, amount: j.TransAmount, name: j.FirstName }); } catch {}
    return json(res, 200, { ResultCode: 0, ResultDesc: 'Accepted' });
  }
  if (url.pathname === '/admin/export') {
    if (!authed) return json(res, 401, { error: 'bad key' });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename=jackpot-backup.json' });
    return res.end(JSON.stringify(db, null, 1));
  }
  // 3) Manual add: /admin/add?key=...&amount=500&name=Jane&code=CASH1
  if (url.pathname === '/admin/add') {
    if (!authed) return json(res, 401, { error: 'bad key' });
    const q = url.searchParams;
    return json(res, 200, { result: addPayment({ code: q.get('code') || 'MAN' + Date.now(), amount: q.get('amount'), name: q.get('name') }) });
  }

  // Pages (embedded so only this one file is needed)
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(INDEX_HTML); }
  if (req.method === 'GET' && url.pathname === '/admin.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(ADMIN_HTML); }
  json(res, 404, { error: 'not found' });
}).listen(CFG.port, () => console.log(`Effort Jackpot running on http://localhost:${CFG.port}`));
