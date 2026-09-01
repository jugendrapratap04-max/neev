/* Confirms every <img> on every page actually decodes. Full-page captures
   lazy-load, which makes blank cards look like a bug when they are not. */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(p=>p&&existsSync(p));
const PORT = 9343;
const proc = spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--disable-gpu','--hide-scrollbars','--no-first-run','--user-data-dir='+process.env.TEMP+'/neev-imgcheck','about:blank'],{stdio:'ignore'});
let list=null; for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/list`);list=await r.json();if(list.length)break;}catch{}await sleep(250);}
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r));
let id=0;const pend=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.result?.value;
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
let bad=0,total=0;
for (const f of readdirSync('.').filter(f=>f.endsWith('.html'))) {
  await send('Page.navigate',{url:'http://localhost:4322/'+f});
  for(let i=0;i<40;i++){await sleep(150);if(await ev('document.readyState==="complete"'))break;}
  const r = await ev(`(async () => {
    const imgs=[...document.images];
    imgs.forEach(i=>i.loading='eager');
    await Promise.all(imgs.map(i=>i.complete?null:new Promise(res=>{i.onload=i.onerror=res;})));
    return { total: imgs.length, broken: imgs.filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')) };
  })()`);
  total += r.total;
  if (r.broken.length) { bad += r.broken.length; console.log(f, 'BROKEN:', r.broken.join(', ')); }
}
console.log(bad ? `${bad} broken of ${total}` : `all ${total} images decode across every page`);
ws.close();proc.kill();
