import { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Shadow Relay Operacional');
});

const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const id = params.get('id');

    if (!id) {
        ws.terminate();
        return;
    }

    // Registra o cliente (Kali ou Worker)
    clients.set(id, ws);
    console.log(`[+] Conectado: ${id}`);

    // Se o Kali conectar, avisa que o sistema está pronto
    if (id === 'KALI') {
        ws.send(JSON.stringify({ t: 'sys', msg: 'READY' }));
    }

    // Notifica o Kali que um novo nó (Colab) entrou
    if (id.startsWith('node-')) {
        const kali = clients.get('KALI');
        if (kali) kali.send(JSON.stringify({ t: 'bot', id: id, s: 'on' }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Se o Kali envia tarefa -> Encaminha para o Worker específico
            if (id === 'KALI' && data.to) {
                const target = clients.get(data.to);
                if (target) target.send(JSON.stringify(data.cmd));
            } 
            // Se o Worker envia resultado -> Encaminha para o Kali
            else if (id.startsWith('node-')) {
                const kali = clients.get('KALI');
                if (kali) kali.send(JSON.stringify({ t: 'res', f: id, d: data }));
            }
        } catch (e) {
            console.error("Erro no processamento de mensagem");
        }
    });

    ws.on('close', () => {
        clients.delete(id);
        if (id.startsWith('node-')) {
            const kali = clients.get('KALI');
            if (kali) kali.send(JSON.stringify({ t: 'bot', id: id, s: 'off' }));
        }
        console.log(`[-] Desconectado: ${id}`);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Relay rodando na porta ${PORT}`);
});
